"""
TrustLens ML Training, Calibration, and Export Pipeline.
Trains LightGBM classifier, applies Isotonic Probability Calibration,
evaluates zero-day holdout metrics, signs bundle with Ed25519,
and exports compact JSON tree ensemble for in-browser inference.
"""

import base64
import hashlib
import json
import os
import sys
from typing import Dict, List, Any, Tuple

import lightgbm as lgb
import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    roc_auc_score,
    precision_recall_curve,
    auc,
    confusion_matrix,
    classification_report
)
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

# Add ml root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.datasets.ingest import generate_synthetic_samples
from src.features.extractor import FeatureExtractor
from src.features.schema import FEATURE_NAMES, FEATURE_COUNT

def serialize_lgb_tree(tree_info: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively serializes a LightGBM tree node into flat JSON format."""
    nodes = []

    def traverse(node: Dict[str, Any]) -> int:
        node_idx = len(nodes)
        nodes.append({}) # reserve slot

        if "leaf_value" in node:
            # Leaf node
            nodes[node_idx] = {
                "is_leaf": True,
                "value": round(float(node["leaf_value"]), 6)
            }
            return node_idx

        # Split node
        split_feature = int(node["split_feature"])
        threshold = round(float(node["threshold"]), 6)
        default_left = bool(node.get("default_left", True))

        left_idx = traverse(node["left_child"])
        right_idx = traverse(node["right_child"])

        nodes[node_idx] = {
            "is_leaf": False,
            "feature": split_feature,
            "threshold": threshold,
            "left": left_idx,
            "right": right_idx,
            "default_left": default_left
        }
        return node_idx

    traverse(tree_info["tree_structure"])
    return {"nodes": nodes}

def run_pipeline():
    print("=" * 60)
    print("TrustLens ML Training & Export Pipeline")
    print("=" * 60)

    # 1. Dataset Generation
    print("[1/6] Synthesizing multi-archetype dataset (1600 samples)...")
    samples = generate_synthetic_samples(count=1600, seed=42)

    X_list = []
    y_list = []
    timestamps = []
    domains = []

    for s in samples:
        vec = FeatureExtractor.extract_features(s["url"], s["html"], s["context"])
        X_list.append(vec)
        y_list.append(s["label"])
        timestamps.append(s["timestamp"])
        domains.append(s["domain"])

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)
    timestamps = np.array(timestamps)

    # 2. Time-Based Stratified Split (Zero-Day Generalization)
    # Train/Val: timestamp <= 65; Holdout: timestamp > 65
    train_val_mask = timestamps <= 65
    test_mask = timestamps > 65

    X_train_val = X[train_val_mask]
    y_train_val = y[train_val_mask]
    X_test = X[test_mask]
    y_test = y[test_mask]

    # Further split train_val into train (80%) and val (20%) for calibration
    n_tv = len(X_train_val)
    indices = np.random.RandomState(42).permutation(n_tv)
    val_size = int(n_tv * 0.20)
    val_idx = indices[:val_size]
    train_idx = indices[val_size:]

    X_train, y_train = X_train_val[train_idx], y_train_val[train_idx]
    X_val, y_val = X_train_val[val_idx], y_train_val[val_idx]

    print(f"Data Split: Train={len(X_train)} (Pos={sum(y_train)}), "
          f"Val={len(X_val)} (Pos={sum(y_val)}), "
          f"Holdout Test={len(X_test)} (Pos={sum(y_test)})")

    # 3. Model Training
    print("[2/6] Training LightGBM Gradient Boosted Decision Trees...")
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "boosting_type": "gbdt",
        "n_estimators": 50,
        "max_depth": 5,
        "num_leaves": 25,
        "learning_rate": 0.08,
        "min_child_samples": 8,
        "verbose": -1,
        "random_state": 42
    }

    model = lgb.train(
        params,
        train_data,
        valid_sets=[train_data, val_data],
        callbacks=[lgb.early_stopping(stopping_rounds=10, verbose=False)]
    )

    # Raw margin predictions on validation set
    val_raw = model.predict(X_val, raw_score=True)

    # 4. Probability Calibration (Isotonic Regression)
    print("[3/6] Fitting Isotonic Probability Calibration...")
    val_probs_raw = 1.0 / (1.0 + np.exp(-val_raw))
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    calibrator.fit(val_probs_raw, y_val)

    # Evaluate Holdout Metrics
    print("[4/6] Evaluating Holdout Test Set (Zero-Day Generalization)...")
    test_raw = model.predict(X_test, raw_score=True)
    test_probs_raw = 1.0 / (1.0 + np.exp(-test_raw))
    test_probs_calibrated = calibrator.predict(test_probs_raw)

    roc_auc = roc_auc_score(y_test, test_probs_calibrated)
    precision, recall, thresholds = precision_recall_curve(y_test, test_probs_calibrated)
    pr_auc = auc(recall, precision)

    # Compute Recall at False Positive Rate <= 0.5% (0.005)
    benign_scores = test_probs_calibrated[y_test == 0]
    phish_scores = test_probs_calibrated[y_test == 1]

    # Threshold for 0.5% FPR
    fpr_target = 0.005
    threshold_at_fpr = np.percentile(benign_scores, 100 * (1.0 - fpr_target))
    recall_at_fpr = np.mean(phish_scores >= threshold_at_fpr)

    print("-" * 50)
    print(f"Holdout ROC-AUC:                {roc_auc:.4f}")
    print(f"Holdout PR-AUC:                 {pr_auc:.4f}")
    print(f"Recall @ <=0.5% FPR:            {recall_at_fpr * 100:.2f}%")
    print(f"Threshold for 0.5% FPR:         {threshold_at_fpr:.4f}")
    print("-" * 50)

    # 5. Tree Model Serialization to JSON
    print("[5/6] Serializing Trees & Calibration Curve...")
    model_dump = model.dump_model()
    serialized_trees = [serialize_lgb_tree(t) for t in model_dump["tree_info"]]

    # Calibration breakpoints
    calib_x = [round(float(x), 5) for x in calibrator.X_thresholds_]
    calib_y = [round(float(y_val), 5) for y_val in calibrator.y_thresholds_]

    # Base score / prior
    base_score = 0.0

    model_bundle = {
        "model_version": "1.0.0",
        "feature_names": FEATURE_NAMES,
        "feature_count": FEATURE_COUNT,
        "tree_count": len(serialized_trees),
        "trees": serialized_trees,
        "base_score": base_score,
        "calibrator": {
            "type": "isotonic",
            "x_thresholds": calib_x,
            "y_values": calib_y
        },
        "metrics": {
            "roc_auc": round(float(roc_auc), 4),
            "pr_auc": round(float(pr_auc), 4),
            "recall_at_0_5_fpr": round(float(recall_at_fpr), 4)
        }
    }

    # 6. Ed25519 Cryptographic Signing
    print("[6/6] Generating Ed25519 Keys and Signing Model Bundle...")
    canonical_json = json.dumps(model_bundle, sort_keys=True, separators=(',', ':'))
    sha256_hex = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    # Sign the SHA256 hex string directly
    signature = private_key.sign(sha256_hex.encode("utf-8"))
    signature_b64 = base64.b64encode(signature).decode("utf-8")

    # Public key raw bytes in hex & base64
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    pub_key_hex = pub_bytes.hex()

    model_bundle["signature"] = signature_b64
    model_bundle["sha256"] = sha256_hex

    # Save to ML export
    ml_export_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "export"))
    os.makedirs(ml_export_dir, exist_ok=True)
    bundle_path = os.path.join(ml_export_dir, "model_bundle.json")

    with open(bundle_path, "w", encoding="utf-8") as f:
        json.dump(model_bundle, f, indent=2)

    # Save public key for verification
    pub_key_path = os.path.join(ml_export_dir, "ed25519_public_key.hex")
    with open(pub_key_path, "w", encoding="utf-8") as f:
        f.write(pub_key_hex)

    # Also directly embed into extension/src/engine/bundled-model.json
    ext_engine_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "extension", "src", "engine"))
    os.makedirs(ext_engine_dir, exist_ok=True)
    ext_bundle_path = os.path.join(ext_engine_dir, "bundled-model.json")
    with open(ext_bundle_path, "w", encoding="utf-8") as f:
        json.dump(model_bundle, f, indent=2)

    # Write public key to extension constants
    ext_pub_key_ts = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "extension", "src", "adaptive", "public-key.ts"))
    os.makedirs(os.path.dirname(ext_pub_key_ts), exist_ok=True)
    with open(ext_pub_key_ts, "w", encoding="utf-8") as f:
        f.write(f'export const TRUSTLENS_ED25519_PUBLIC_KEY = "{pub_key_hex}";\n')

    print(f"\n[SUCCESS] Model Bundle successfully exported to:")
    print(f"  - {bundle_path} ({os.path.getsize(bundle_path) / 1024:.1f} KB)")
    print(f"  - {ext_bundle_path}")
    print(f"  - Ed25519 Public Key: {pub_key_hex[:16]}... (saved to {ext_pub_key_ts})")
    print("=" * 60)

if __name__ == "__main__":
    run_pipeline()
