# TrustLens Privacy Specification & Data Protection Architecture

**Version:** 1.0.0  
**Data Policy:** Strict Zero-Egress On-Device Processing by Default  
**Compliance Standards:** Privacy-by-Design, GDPR Data Minimization, CCPA/CPRA  

---

## 1. Core Privacy Commitments

1. **Zero External Data Egress:**  
   In standard operation, TrustLens **never transmits any network requests** to external servers. All evaluation logic, feature extractors, tree models, explainability engines, and reputation lookups execute locally within the browser runtime.
2. **Zero Content or Key Logging:**  
   TrustLens examines structural attributes of HTML elements (e.g. `type="password"`, `action="..."`, `tagName === "FORM"`). It **never reads, inspects, logs, or stores user-entered keystrokes, password values, or personal details**.
3. **No Browsing History Profiling:**  
   Cached evaluation scores are stored in ephemeral in-memory tables and discarded when tabs are closed. URLs are not permanently logged or compiled into a browsing history database.

---

## 2. Browser Extension Permissions & Least-Privilege Justification

TrustLens adheres strictly to the principle of least privilege in its Chrome Manifest V3 declaration:

| Declared Permission | Technical Justification | Least-Privilege Constraint & Boundary |
| :--- | :--- | :--- |
| `webNavigation` | Required to observe top-level navigation start, redirection hops, and stage triggers (`onBeforeNavigate`, `onCommitted`, `onCompleted`). | Passive listener only; does not intercept, modify, or block network request payloads. |
| `storage` | Required for persistent extension preferences (sensitivity setting, user trust/deny lists, encrypted feedback state). | Local `chrome.storage.local` and IndexedDB storage only. No cloud syncing. |
| `activeTab` | Grants temporary access to the active tab to display the TrustLens badge status and allow user interaction via popup. | Granted only when user interacts with the extension icon. |
| `declarativeNetRequest` (Optional) | Used only for instant blocking redirect when a `Dangerous` verdict is issued and user chooses not to bypass. | Uses static local rulesets; does not inspect or log user traffic. |
| `host_permissions: ["<all_urls>"]` | Required to execute the content script feature extractor on arbitrary web pages to detect zero-day phishing across new domains. | Content script runs in an isolated world with zero network access permissions (`connect-src 'none'`). |

---

## 3. Content Security Policy (CSP)

To guarantee zero data exfiltration, the extension's `manifest.json` defines a strict Content Security Policy:

```json
{
  "content_security_policy": {
    "extension_pages": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; frame-ancestors 'none';"
  }
}
```

- **`connect-src 'none'`**: Completely blocks `fetch`, `XMLHttpRequest`, and `WebSocket` calls from extension pages, providing mathematical certainty that zero telemetry or browsing data can be exfiltrated.
- **`script-src 'self'`**: Disallows `eval()`, inline scripts, and remote code injection, eliminating dynamic script execution vulnerabilities.

---

## 4. Local Cryptographic Storage (WebCrypto AES-256-GCM)

When a user flags a website (e.g. "Always trust this domain" or "Report false positive"):
- The feedback item is serialized into a localized record: `{ domainHash, timestamp, score, userAction }`.
- The record is encrypted at rest inside IndexedDB using **WebCrypto AES-256-GCM** with a non-exportable key derived locally within the extension storage sandbox.
- Even if another local application accesses the browser profile on disk, the feedback store remains confidential.

---

## 5. Optional Opt-in Federated Feedback Architecture (Off by Default)

If a user explicitly opts in to telemetry (disabled by default in Settings):
- **Never Sent:** Full URLs, domain names, page titles, HTML content, or IP addresses.
- **Sent Only:** A 44-dimensional numerical feature vector perturbated with **Local Differential Privacy ($\epsilon$-DP Laplace/Gaussian noise)**:
  $$\tilde{x}_i = x_i + \text{Laplace}\left(0, \frac{\Delta f}{\epsilon}\right)$$
- The vector is submitted over an anonymous channel with zero cookies or persistent user identifiers to preserve mathematical differential privacy.
