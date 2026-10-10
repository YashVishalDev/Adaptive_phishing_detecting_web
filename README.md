# TrustLens: Adaptive Phishing Detection & Website Trust Engine

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-green.svg)](#)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.7-blue.svg)](#)
[![Inference](https://img.shields.io/badge/Inference-TreeSHAP_Pure_TS-cyan.svg)](#)
[![Privacy](https://img.shields.io/badge/Privacy-Zero--Egress-emerald.svg)](#)

TrustLens is a production-grade, defensive browser extension (Chrome/Edge MV3, Firefox-ready) and ML pipeline designed to detect previously unseen (zero-day) phishing attacks in real time directly within the browser client.

Unlike static blacklists that fail against fast-flux domains and ephemeral phishing kits, TrustLens evaluates 44 real-time multi-dimensional signals across URL structure, DOM content, form destinations, redirection chains, and transport security. Every verdict is explainable to non-technical users and fully auditable by technical engineers.

---

## Key Capabilities

- **Zero-Egress Privacy:** 100% on-device evaluation by default. Page content, credentials, and full URLs never leave the client.
- **Sub-2ms Pure TypeScript Inference:** Hand-rolled JSON tree-ensemble evaluator and exact client-side TreeSHAP path attribution engine (<65 KB model, zero WASM/C++ runtime overhead, native missing-value tolerance).
- **Multi-Stage Progressive Scoring:**
  - **Stage 1 (Pre-Navigation):** Evaluates reputation (Tranco top-10k hash set + compact Bloom filter) and URL lexical structure at `onBeforeNavigate`.
  - **Stage 2 (DOMContentLoaded):** Evaluates page elements, forms, script origin ratios, and asset origins upon parse.
  - **Stage 3 (Dynamic Mutation):** Triggered by debounced MutationObserver when credential fields are injected or password inputs are focused.
- **Explainability Layer:** Every non-Safe verdict translates top contributing features and rule activations into plain-language reasons with sanitized evidence snippets, "Why this matters" tooltips, and a one-click JSON Explanation Report export.
- **Local Adaptation & Cryptographic Verification:** WebCrypto AES-256-GCM encrypted local feedback storage, drift detection via Population Stability Index (PSI), and Ed25519 digitally signed model update delivery.
- **Adversarial Resilience:** Evaluated against 6 evasion techniques (Punycode homoglyphs, delimiter stuffing, delayed DOM injection, iframe nesting, obfuscated JS anti-analysis, dead link masking) with a 93.8% detection rate.

---

## Monorepo Layout

```
/
├── extension/                         # Chrome MV3 / WebExtension package
│   ├── manifest.json                  # MV3 permissions, CSP, content scripts
│   ├── src/
│   │   ├── background/                # Service worker: navigation monitoring, scoring, cache
│   │   ├── content/                   # Lightweight DOM observer & feature extractor
│   │   ├── features/                  # 44 canonical signals (URL, DOM, Form, TLS, Reputation)
│   │   ├── engine/                    # Tree evaluator, TreeSHAP, Rule layer, Calibrator, Fusion
│   │   ├── adaptive/                  # Encrypted store, drift detection, Ed25519 verifier
│   │   └── ui/                        # Popup, Full-page warning interstitial, Options page
│   └── tests/                         # Vitest unit tests (Parity, Engine, Reputation, Adaptive, Egress)
├── ml/                                # Python ML research & training pipeline
│   ├── src/features/                  # Python feature extractors (100% parity with TS)
│   ├── src/datasets/                  # PhishTank, OpenPhish, Tranco, synthetic generators
│   ├── src/training/                  # Time-stratified training, isotonic calibration
│   └── src/export/                    # Tree JSON export & Ed25519 cryptographic signing
├── backend/                           # Optional companion service (FastAPI, off-by-default)
├── tests/                             # Parity, Adversarial suite, and synthetic test fixtures
└── docs/                              # Architecture, Threat Model (STRIDE), Feature Catalog, Privacy
```

---

## Quickstart & Verification

### 1. Build Extension & Production ZIP
```bash
cd extension
npm install
npm run package
```
- Produces unpacked loadable extension in `extension/dist/`.
- Produces production ZIP package `extension/trustlens-v1.0.0.zip` (82.1 KB).

### 2. Run All Extension Tests (Vitest)
```bash
cd extension
npm test
```
Executes 28 automated tests covering:
- Python vs TypeScript feature parity (16 golden vectors across 44 features)
- Tree evaluator, TreeSHAP explainer, and Rule layer
- Compact Bloom filter and Tranco reputation store
- WebCrypto encrypted feedback storage, anti-poisoning calibration, and PSI drift detection
- Zero-egress network privacy verification

### 3. Run ML Pipeline Tests & Training (Python)
```bash
# Run ML tests
python -m pytest ml/tests/test_pipeline.py

# Run model training, calibration & Ed25519 export
python ml/src/training/train.py
```

### 4. Run Adversarial Robustness Benchmark
```bash
python tests/adversarial/adversarial_runner.py
```
Output verifies >=90% adversarial evasion detection across homoglyphs, delimiters, delayed forms, iframes, and obfuscated JavaScript.

### 5. Run Optional Companion Backend
```bash
python -m pytest backend/tests/test_backend.py
```

---

## Loading in Chrome / Edge

1. Open `chrome://extensions` (or `edge://extensions`).
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select `trustlens/extension/dist`.
4. The TrustLens shield icon will appear in your toolbar.
5. Navigate to any website to see real-time Trust Scores (0-100) and plain-language explainability reports!
