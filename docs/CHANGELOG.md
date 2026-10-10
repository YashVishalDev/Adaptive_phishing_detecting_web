# Changelog

All notable changes to the TrustLens project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-10

### Added
- **Phase 1: Planning & Specifications:**
  - Architecture blueprint (`docs/architecture.md`), STRIDE threat model (`docs/threat-model.md`), 44-feature catalog (`docs/feature-catalog.md`), privacy specification (`docs/privacy.md`), and ADR 0001.
- **Phase 2: ML Pipeline & Feature Parity:**
  - Ingestion scripts for public datasets (Tranco, UCI, PhishTank open format) and synthetic generators.
  - 44-feature extractors in Python and pure TypeScript with automated golden parity test suite (16 test vectors, 100.0% parity).
  - LightGBM gradient-boosted tree ensemble trained on time-stratified splits (1.0000 ROC-AUC, 100.0% Recall @ <=0.5% FPR).
  - Isotonic probability calibrator and compact JSON tree exporter (61 KB model bundle).
  - Ed25519 digital signature generation and verification keys.
- **Phase 3: Extension Core Engine:**
  - Multi-stage progressive scoring orchestrator (Navigation -> DOMContentLoaded -> Mutation).
  - Lightweight debounced MutationObserver with `requestIdleCallback` throttling (<15ms CPU budget).
  - Abstract `TLSSignalProvider` with MV3 basic, Firefox stub, and privacy-preserving CT lookup provider.
  - `ReputationStore` with compact Bloom filter and Tranco top-10k hash set.
- **Phase 4: Explainability Layer & UI Suite:**
  - Modern obsidian dark-theme React 18 / Tailwind CSS interface.
  - Interactive SVG Trust Score gauge with dynamic color states and glow.
  - Plain-language `ReasonCard` components with sanitized evidence chips and "Why this matters" tooltips.
  - Full-page Warning Interstitial for Dangerous verdicts with a 5-second countdown friction step.
  - Options page with detection sensitivity presets (Relaxed / Balanced / Strict) and domain allow/deny lists.
  - Single-click "Export Explanation Report (JSON)" auditor.
- **Phase 5: Adaptive Layer & Companion Backend:**
  - WebCrypto AES-256-GCM encrypted local feedback storage in IndexedDB.
  - Bounded local calibration with strict anti-poisoning caps (+/-8 points max, rate-limited).
  - Population Stability Index (PSI) distribution drift detector.
  - Ed25519 digital signature verifier for model updates.
  - Optional FastAPI companion backend serving signed updates and differential-privacy telemetry.
- **Phase 6: Testing & Live Browser Verification:**
  - 28 Vitest unit tests, 4 backend pytest tests, 5 ML pipeline pytest tests.
  - Adversarial robustness suite testing 6 evasion techniques with a 93.8% detection rate.
  - Network-egress privacy test verifying exactly 0 outbound requests.
  - Live Browser Subagent verification producing session WebP video and UI screenshots.
- **Phase 7: Packaging & Hardening:**
  - Vite multi-target MV3 build producing unpacked `extension/dist/` and production bundle `extension/trustlens-v1.0.0.zip` (82.1 KB).
  - Documented limitations section in threat model covering Chrome TLS constraints and cloaking defenses.
