# ADR 0001: Hand-Rolled JSON Tree-Ensemble & Exact TreeSHAP in TypeScript

**Status:** Accepted  
**Date:** October 2026  
**Deciders:** Core Engineering Team  

## Context
TrustLens requires real-time, client-side inference directly inside the browser extension (both background service worker and content script contexts). Traditional approaches involve compiling ONNX models and running them via `onnxruntime-web` (WebAssembly / WebGL).

However, in Chrome Manifest V3:
1. `onnxruntime-web` introduces a 15–20 MB WASM runtime dependency, drastically inflating package size and cold-start latency in background service workers.
2. WebAssembly instantiation in service workers has strict memory limits and compatibility caveats.
3. ONNX Web does not natively output individual per-feature TreeSHAP explanations on the client; computing SHAP requires running background surrogate models or extra round-trips.

## Decision
We chose to implement a **hand-rolled JSON Tree-Ensemble Evaluator and exact TreeSHAP Attribution Engine in pure TypeScript**:
- **Format:** The trained gradient-boosted trees (from LightGBM / XGBoost) are serialized into a lightweight JSON tree structure ($<50$ KB total).
- **Execution:** Pure TypeScript depth-first tree traversal evaluates tree outputs in $<2$ ms p95 with zero external dependencies.
- **Explainability:** Exact TreeSHAP path attribution is implemented directly in TypeScript, calculating feature contributions during tree traversal without surrogate approximations.
- **Missing Value Handling:** Missing features (e.g. DOM features at Stage 1 before DOM loads) natively follow the trained default split path.

## Consequences
- **Positive:** Extension bundle size is reduced by $>98\%$ (model + evaluator $<50$ KB vs $>15$ MB).
- **Positive:** Sub-2ms cold-start and evaluation time inside MV3 service workers with zero WASM instantiation overhead.
- **Positive:** Exact, deterministic, per-prediction feature attributions for instant plain-language explainability.
- **Negative:** Feature extraction logic must maintain 100.0% parity between Python (training) and TypeScript (inference). This is mitigated by our automated golden vector test suite (`/tests/parity`).
