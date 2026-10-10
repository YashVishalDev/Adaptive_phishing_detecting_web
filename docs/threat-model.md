# TrustLens Threat Model & Security Analysis

**Codename:** TrustLens  
**Security Standard:** STRIDE Threat Modeling + NIST SP 800-53 / OWASP ASVS Defensive Principles  
**Status:** Living Document  

---

## 1. Threat Landscape & Attacker Profiles

TrustLens operates in an adversarial environment where attackers actively craft deceptive web infrastructure to harvest user credentials and sensitive personal information.

### 1.1 Attacker Profiles
1. **Low-Tier Phisher (Commodity Phishing Kits):**
   - Deploys off-the-shelf kits on compromised WordPress sites or free hosting platforms.
   - Relies on basic typosquatting, free TLDs (`.xyz`, `.top`, `.tk`), and raw form POST actions.
2. **Intermediate Adversary (Reverse-Proxy / MitM Phishers):**
   - Utilizes tools like Evilginx2 / Modlishka to proxy live sessions and bypass 2FA/FIDO.
   - Leverages Let's Encrypt for valid TLS certificates, dynamic subdomains, and obfuscated JavaScript redirection chains.
3. **Advanced Targeted Adversary (Nation-State / Advanced Crime Syndicates):**
   - Crafts targeted homograph attacks (IDN punycode, Unicode look-alikes).
   - Deploys cloaking techniques: fingerprinting browser user-agents, IP ranges (filtering out security scanners and sandboxes), delayed DOM injection, and multi-layered iframe encapsulation.

---

## 2. STRIDE Analysis of TrustLens Extension

| STRIDE Threat | Potential Vulnerability / Attack Vector | Severity | TrustLens Defensive Countermeasure |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Malicious web page attempts to impersonate extension background worker or inject fake `runtime.sendMessage` responses. | **High** | Content scripts run in an isolated world. Content-to-background messaging uses one-way internal ports with strict schema validation and tab origin verification (`sender.tab.id`). |
| **Tampering** | Attacker modifies model bundle during delivery or injects malicious feature weights. | **Critical** | Model bundles are signed with an **Ed25519 digital signature**. The public key is hardcoded in extension source code. Any signature or schema hash mismatch triggers instant rejection and rollback. |
| **Repudiation** | User reports a false positive or changes settings; audit trails are disputed or missing. | **Low** | Local audit logs are cryptographically tagged with a local hash and timestamp; no external attribution is needed because all processing is local. |
| **Information Disclosure** | Page URL, full DOM content, or entered credentials leak to external services or cloud APIs. | **Critical** | **Strict Zero-Egress Architecture**: Extension declares strict CSP (`connect-src 'none'`), reads element types and attributes only (never input values), and never transmits browsing history off-device. |
| **Denial of Service** | Malicious site triggers continuous DOM mutations to exhaust extension CPU and hang the browser. | **Medium** | Content script mutation observer is debounced (250 ms), capped at 50 mutations per page lifecycle, throttled via `requestIdleCallback`, and enforces a 15 ms execution budget. |
| **Elevation of Privilege** | Untrusted page content (e.g., page `<title>` or manipulated link text) triggers DOM-XSS inside the warning interstitial or popup. | **Critical** | All DOM-derived strings are sanitized before rendering. UI uses React's JSX auto-escaping, zero `dangerouslySetInnerHTML`, and an uncompromising MV3 Content Security Policy. |

---

## 3. Adversarial Phishing Evasion Techniques & Defensive Mitigations

### 3.1 Cloaking & Scanner Evasion
- **Attack:** Phishing server displays benign content to automated crawlers, IP addresses associated with cloud providers, or head-less browsers, but displays phishing payloads to real users.
- **TrustLens Defense:** Because TrustLens executes **directly inside the user's authentic browser session** at runtime, it evaluates the exact DOM tree rendered in the user's actual viewport. Remote server-side cloaking against crawlers is completely ineffective against TrustLens.

### 3.2 Delayed DOM Injection (Late Rendering)
- **Attack:** Page loads completely empty or with benign placeholder text. After a delay of 2–5 seconds, an asynchronous script fetches and injects the credential harvesting form into the DOM.
- **TrustLens Defense:** Staged scoring architecture. While Stage 1 and Stage 2 evaluate on initial load, a persistent `MutationObserver` continuously watches for input additions. When an `<input type="password">` or form element is inserted dynamically, Stage 3 scoring triggers immediately.

### 3.3 Nested Iframe Encapsulation
- **Attack:** Login form is loaded inside an external `<iframe>` (e.g. hosted on an external legitimate cloud storage URL) to evade parent document inspections.
- **TrustLens Defense:** Content scripts are configured with `"all_frames": true` in `manifest.json`. The engine analyzes each frame independently while also flagging parent pages with foreign-origin iframe authentication traps (`iframe_count` and cross-origin frame relationships).

### 3.4 IDN Homoglyphs & Confusable Characters
- **Attack:** Attacker registers `раураl.com` (using Cyrillic `а` U+0430) which visually mimics `paypal.com`.
- **TrustLens Defense:** `url-extractor` converts hostnames via punycode decomposition, flags `xn--` prefixes, and performs Unicode confusable skeleton transformation (Unicode TR39) to detect deceptive brand look-alikes.

### 3.5 Obfuscated JavaScript & Anti-Analysis
- **Attack:** Attacker encodes page elements using nested `eval(atob(...))` chains or disables right-click and developer tools.
- **TrustLens Defense:** Anti-analysis triggers (e.g. `contextmenu` cancellation, selection suppression) are directly modeled as suspicious feature inputs (`context_menu_disabled`, `obfuscated_js_detected`), actually increasing the phishing risk score!

---

## 4. Platform Constraints: Chrome MV3 vs Firefox

| Security Capability | Chrome MV3 (Chromium) | Firefox (Gecko / WebExtension) | TrustLens Implementation |
| :--- | :--- | :--- | :--- |
| **Full X.509 Certificate Inspection** | **Not Exposed** to extensions via WebRequest API. | Available via `browser.webRequest.getSecurityInfo()`. | Abstracted behind `TLSSignalProvider`. Basic provider uses protocol & HSTS checks; Firefox provider reads certificate issuer & validity days. |
| **Declarative Net Request** | Mandatory for network interception; limited dynamic inspection. | Supports both `webRequest` blocking and DNR. | TrustLens uses passive `webNavigation` and passive `webRequest` observation without blocking network requests, preserving user privacy and high speed. |
| **Service Worker Lifetime** | Background service workers terminate after 30 seconds of inactivity. | Persistent background scripts available. | All background state (reputation cache, session scores) is stored in transient memory with fast IndexedDB backing for persistent preferences. |

---

## 5. Security Summary & Safe Boundaries

TrustLens is explicitly engineered as a purely defensive instrument:
- It **does not** generate synthetic attack payloads against third parties.
- It **does not** collect user keystrokes, passwords, or personal data.
- It operates safely within strict browser sandbox boundaries with auditable source code.

---

## 6. Documented Limitations & Residual Risks

### 6.1 Chrome MV3 TLS API Visibility Constraint
- **Technical Barrier:** In Chrome Manifest V3, the Chromium security team deprecated webRequest blocking and does not expose full X.509 certificate chains, SAN extensions, or certificate validity dates to extension background service workers or content scripts.
- **Engine Behavior:** TrustLens handles this transparently via the abstract `TLSSignalProvider`. In Chrome MV3, `tls_validity_days` is assigned an explicit missing value (`-1`), which the tree ensemble handles natively via its trained default split pathway.
- **Cross-Platform Mitigation:** On Firefox, `FirefoxTLSProvider` leverages `browser.webRequest.getSecurityInfo()` to extract real certificate expiry and issuer metadata. For enterprise deployments, an optional CT log proxy can perform privacy-preserving lookups on registrable apex domains only.

### 6.2 Advanced Client-Side Cloaking
- **Threat:** Advanced adversaries may attempt to fingerprint browser extensions or detect automated security crawlers by inspecting window attributes or timing discrepancies.
- **Defensive Posture:** TrustLens runs within an isolated content world and attaches zero global variables to `window` or `document`. Furthermore, if an attacker injects aggressive anti-debugging or context-menu suppression scripts, TrustLens features (`context_menu_disabled`, `obfuscated_js_detected`) directly flag the page as anomalous, increasing the threat score.

### 6.3 Ephemeral Zero-Day Phishing without Recognized Brand Spoofing
- **Edge Case:** An attacker targets a small regional business or university whose brand is not in the top-500 global dictionary, while hosting on a non-flagged TLD and posting credentials through a local reverse-proxy backend.
- **Detection Baseline:** The ML tree ensemble relies heavily on structural DOM signals (login form present on unranked domain, high ratio of dead links, anomalous hidden overlays, external CSS/script ratios) to trigger `Caution` or `Suspicious` verdicts even when brand keyword matching is unavailable.
