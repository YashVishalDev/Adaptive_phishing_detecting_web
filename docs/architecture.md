# TrustLens Architecture Specification

**Codename:** TrustLens (Adaptive Phishing Detection & Website Trust Engine)  
**Version:** 1.0.0  
**Target:** Chrome/Edge Manifest V3, WebExtension Polyfill (Firefox-ready)  
**Security Status:** Defensive Security Tooling  

---

## 1. System Overview

TrustLens is an explainable, client-side browser security engine providing real-time phishing and website trust evaluations without relying on external cloud APIs during navigation. It employs a multi-tiered, multi-stage architecture spanning URL structure, DOM layout, form behavior, redirection flows, and transport security.

```
+--------------------------------------------------------------------------------------------------+
|                                    BROWSER RUNTIME (MV3)                                         |
|                                                                                                  |
|  +--------------------+        +-----------------------+        +-----------------------------+  |
|  |   Content Script   | <----> |  Background Worker    | <----> |  UI Layer (React/Tailwind)  |  |
|  |  (DOM / Forms /    | IPC    |  (Orchestrator, Nav,  | State  |  - Popup (Gauge & Reasons)  |  |
|  |   MutationObserver)| Port   |   Reputation, Rules,  | Sync   |  - Interstitial (Warning)   |  |
|  +--------------------+        |   Tree Evaluator,     |        |  - Options & Privacy Center |  |
|                                |   TreeSHAP Explainer) |        +-----------------------------+  |
|                                +-----------+-----------+                                         |
|                                            |                                                     |
|                                            v                                                     |
|                                +-----------------------+                                         |
|                                |   Encrypted Storage   |                                         |
|                                | (WebCrypto AES-256-GCM|                                         |
|                                |   IndexedDB Feedback) |                                         |
|                                +-----------------------+                                         |
+--------------------------------------------------------------------------------------------------+
                                             ^
                                             | Offline / Opt-in signed bundles
+--------------------------------------------+-----------------------------------------------------+
|                          OFFLINE RESEARCH & TRAINING PIPELINE (/ml)                              |
|                                                                                                  |
|  [Public & Synthetic Data] --> [Python Feature Extractor] --> [LightGBM / XGBoost Model]         |
|                               (100% Parity with TS)         --> [Isotonic Calibrator]            |
|                                                             --> [JSON Tree & Schema Exporter]    |
|                                                             --> [Ed25519 Signer]                 |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Monorepo Structure

```
/
├── extension/                         # Chrome MV3 / WebExtension package
│   ├── manifest.json                  # MV3 permissions, CSP, content scripts
│   ├── package.json                   # Vite, React, Tailwind, Vitest, TypeScript
│   ├── src/
│   │   ├── background/                # Orchestration, navigation hooks, engine wrapper
│   │   ├── content/                   # DOM feature extraction, MutationObserver
│   │   ├── features/                  # Pure TS feature extractors (URL, DOM, Form, TLS)
│   │   ├── engine/                    # Tree evaluator, TreeSHAP, Rule layer, Calibrator, Fusion
│   │   ├── adaptive/                  # Encrypted store, drift detection, signature verification
│   │   ├── ui/                        # Popup, Interstitial warning, Options
│   │   └── types/                     # Shared type definitions
│   └── vite.config.ts                 # Multi-page build config
├── ml/                                # Python ML research & pipeline
│   ├── src/features/                  # Python feature extractors (mirroring TS)
│   ├── src/datasets/                  # PhishTank, OpenPhish, Tranco, synthetic datasets
│   ├── src/training/                  # Time-stratified training, class weighting
│   ├── src/calibration/               # Isotonic & Platt calibration
│   └── src/export/                    # JSON tree export, TreeSHAP weights, schema validator
├── backend/                           # Optional companion server (FastAPI, off-by-default)
├── tests/
│   ├── parity/                        # Golden vector test vectors (Python vs TS)
│   ├── e2e/                           # Playwright end-to-end extension tests
│   ├── adversarial/                   # Defensive evasion & robustness suite
│   └── fixtures/                      # Synthetic benign & phishing web page test fixtures
└── docs/                              # Architecture, Threat Model, Feature Catalog, Privacy
```

---

## 3. Component Details

### 3.1 Content Script (`/extension/src/content`)
- **Isolation:** Operates within isolated world execution. Does not expose extension APIs to page scripts.
- **Performance Budget:** Execution time constrained to $<15$ ms main thread time. Heavy inspections run inside `requestIdleCallback`.
- **Observer:** Employs a debounced `MutationObserver` (250 ms debounce) listening for:
  - Injection of `<input type="password">`
  - Injection of `<iframe>` elements
  - Dynamic replacement of `<form action="...">`
- **Sanitization:** All extracted DOM strings (page titles, input names, action URLs) are treated as untrusted strings. They are sanitized before transmission across message ports.

### 3.2 Service Worker Background Orchestrator (`/extension/src/background`)
- **Navigation Tracker:** Hooks into `chrome.webNavigation.onBeforeNavigate`, `onCommitted`, and `onCompleted` to track:
  - Redirection hops
  - Protocol downgrade events (HTTPS $\rightarrow$ HTTP)
  - Navigation referrers (e.g. arriving from email client or messaging domains)
- **Staged Scoring Coordinator:**
  - **Stage 1 (Pre-Render):** Evaluates fast reputation lookup (Tranco top-10k hash set + local Bloom filter) and URL structural lexical features.
  - **Stage 2 (DOMContentLoaded):** Integrates DOM structure, form inputs, script origin ratios, and asset origins.
  - **Stage 3 (Post-Render / Mutation):** Re-scores on credential field injection or input focus.
- **Cache Management:** Maintains an LRU session cache indexed by `hash(canonical_url)` with a 5-minute TTL to prevent redundant evaluations on tab switches.

### 3.3 Inference Engine (`/extension/src/engine`)
- **Evaluator Design:** Hand-rolled JSON Tree-Ensemble Evaluator.
  - Depth-first node evaluation with missing-value fallback branching.
  - Size: $<50$ KB serialized JSON model.
  - Inference Latency: $<2$ ms p95 on standard modern hardware.
- **TreeSHAP Implementation:** Exact Shapley value computation traversing tree decision paths, outputting signed feature attribution values $\phi_i$ for every feature $i$.
- **Rule Layer:** Fast deterministic hard rules that take precedence over tree probabilities:
  1. Homoglyph + Password field + Cross-origin POST $\rightarrow$ Immediate Dangerous
  2. Subdomain brand match + Insecure HTTP submission $\rightarrow$ Immediate Dangerous
  3. Tranco top-1k apex domain match + clean SSL $\rightarrow$ Fast-path Safe
- **Probability Calibrator:** Piecewise-linear isotonic calibration mapping raw ensemble margin into calibrated probability $P_{\text{phish}} \in [0.0, 1.0]$.
- **Fusion Layer:** Generates an integer Trust Score from $0$ to $100$:
  $$\text{Trust Score} = \text{round}\left(100 \times (1.0 - P_{\text{phish}}) \times \prod \text{RulePenalties}\right)$$
  - **Safe:** $80 - 100$
  - **Caution:** $60 - 79$
  - **Suspicious:** $35 - 59$
  - **Dangerous:** $0 - 34$

### 3.4 Explainability Layer (`/extension/src/engine/reason-catalog.ts`)
- Maps the top 3 contributing risk signals (highest positive TreeSHAP values or triggered hard rules) to clear human-readable explanations.
- Each explanation provides:
  - **Severity:** Critical, Warning, or Informational
  - **Plain Language Statement:** No raw feature names or internal thresholds
  - **Evidence Snippet:** Redacted, safe URL/domain snippet
  - **Context ("Why this matters"):** Practical security advice

---

## 4. Multi-Stage Scoring Lifecycle

```
[User initiates navigation: https://login-bank.secure-update.xyz/verify]
                          |
                          v
         [Stage 1: Pre-Navigation (webNavigation)]
                          |
              +-----------+-----------+
              | Check Reputation Store|
              +-----------+-----------+
             /                         \
    [Tranco Top-10k Hit]       [Unknown or Bloom Hit]
            |                              |
      [Verdict: SAFE]             [Extract URL Features]
            |                              |
            v                              v
     [Render Normal]              [Stage 1 Score & Badge: CAUTION]
                                           |
                                           v
                         [Stage 2: DOMContentLoaded]
                                           |
                           [Content Script Extracts DOM & Forms]
                                           |
                                           v
                         [Background Runs Full Tree Ensemble]
                                           |
                                           v
                       [Isotonic Calibration + Rule Fusion]
                                           |
                                           v
                         [Trust Score: 18 -> DANGEROUS]
                                           |
                                           v
                       [Redirect / Inject Interstitial Warning]
                                           |
              +----------------------------+----------------------------+
              |                                                         |
    [User clicks "Go to Safety"]                   [User clicks "Proceed Anyway (Unsafe)"]
              |                                                         |
     [Navigates back / closes tab]                 [Friction timer (5s) -> Whitelist session]
```

---

## 5. Security & Privacy Guarantees

1. **Zero External Egress:** In default operation, TrustLens performs zero network requests. All models, rules, brand dictionaries, and reputation sets reside within the extension package.
2. **Input Sanitization:** Any text derived from DOM nodes (such as `<title>` or visible link text) is sanitized through strict escaping before rendering in the React UI, preventing DOM-XSS attacks.
3. **No Keylogging or Credential Access:** The content script only inspects input element types (`type="password"`, `type="email"`), names, and form action attributes. It **never** reads input values or keystrokes.
