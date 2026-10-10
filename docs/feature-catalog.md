# TrustLens Canonical Feature Catalog

**Version:** 1.0.0  
**Feature Count:** 44 Canonical Features  
**Evaluation Model:** Staged Progressive Scoring  

---

## 1. Feature Lifecycle & Staged Availability

Features are categorized into three evaluation stages based on when they can be extracted during the navigation lifecycle:

- **Stage 1 (Pre-Navigation / Navigation Start):** Extracted solely from the destination URL, historical redirect hops, and local reputation databases. Latency budget: $<1$ ms.
- **Stage 2 (DOMContentLoaded):** Extracted once the DOM tree is constructed. Evaluates page elements, scripts, styles, forms, and anchor attributes. Latency budget: $<10$ ms.
- **Stage 3 (Post-Render & Dynamic Mutation):** Re-evaluated if asynchronous scripts inject forms, password fields, or mutate document structure.

When a feature is evaluated at an earlier stage where its data is not yet available, it is assigned its canonical `MissingValue` representation, which the tree ensemble handles natively via dedicated split pathways.

---

## 2. Feature Definitions

### 2.1 URL Structure Features (Stage 1)

| # | Feature Name | Type | Range | Default / Missing | Stage | Description & Rationale | Evasion Risk & Mitigation |
| :- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 1 | `url_length` | Integer | $[0, 2048]$ | 0 | 1 | Total character length of normalized URL. Long URLs frequently pack tokens or encoded redirects. | Attacker shortens URL. Mitigated by redirect hop tracking. |
| 2 | `domain_length` | Integer | $[1, 255]$ | 0 | 1 | Length of the full host / domain string. | Attacker uses short domain. Mitigated by brand & entropy signals. |
| 3 | `subdomain_count` | Integer | $[0, 10]$ | 0 | 1 | Number of subdomain labels separated by dots (excluding apex). Deep subdomains mimic legit hierarchies. | Attacker uses apex domain directly. Mitigated by typosquatting distance. |
| 4 | `is_ip_host` | Binary | $\{0, 1\}$ | 0 | 1 | Evaluates to 1 if hostname is an IPv4 or IPv6 address. Legitimate organizations rarely host auth on raw IPs. | Attacker registers cheap domain name. |
| 5 | `has_punycode` | Binary | $\{0, 1\}$ | 0 | 1 | Evaluates to 1 if host contains `xn--` or non-ASCII IDN homoglyphs. Used to imitate known brands. | Attacker uses pure ASCII typosquatting. Handled by Levenshtein distance. |
| 6 | `entropy_domain` | Float | $[0.0, 8.0]$ | 0.0 | 1 | Shannon entropy $H = -\sum p(x)\log_2 p(x)$ of characters in the domain. High entropy signals DGA. | Attacker uses dictionary words. Handled by brand keyword checks. |
| 7 | `digit_ratio_url` | Float | $[0.0, 1.0]$ | 0.0 | 1 | Ratio of numerical digits `0-9` to total URL length. | Attacker omits digits. |
| 8 | `special_char_count` | Integer | $[0, 50]$ | 0 | 1 | Count of suspicious characters (`@`, `//`, `-`, `_`, `=`, `%`). | Attacker minimizes delimiters. |
| 9 | `has_at_symbol` | Binary | $\{0, 1\}$ | 0 | 1 | URL contains `@`. In standard URI syntax, characters before `@` are userinfo and ignored by HTTP host routing. | Attacker omits `@`. |
| 10 | `double_slash_redirect`| Binary | $\{0, 1\}$ | 0 | 1 | URL path contains `//` (beyond `https://`), used for open redirection. | Attacker uses query parameter redirect. |
| 11 | `suspicious_tld` | Binary | $\{0, 1\}$ | 0 | 1 | Evaluates to 1 if domain TLD belongs to high-abuse list (`.xyz`, `.top`, `.tk`, `.ml`, `.ga`, `.cf`, `.gq`, `.buzz`, `.work`, etc.). | Attacker pays for `.com`. Mitigated by domain age & brand matching. |
| 12 | `is_known_shortener` | Binary | $\{0, 1\}$ | 0 | 1 | Domain is a known URL shortener (e.g. `bit.ly`, `tinyurl.com`, `t.co`). | Attacker hosts own shortener. Mitigated by redirect tracker. |
| 13 | `port_anomaly` | Binary | $\{0, 1\}$ | 0 | 1 | URL specifies a non-standard port (`:8080`, `:8443`, `:2082`, `:8888`). | Attacker routes on ports 80/443. |
| 14 | `brand_in_subdomain` | Binary | $\{0, 1\}$ | 0 | 1 | High-profile brand name (e.g. "paypal", "microsoft", "google") appears in subdomain but apex belongs to another entity. | Attacker obfuscates brand name. Handled by fuzzy Levenshtein match. |
| 15 | `brand_in_path` | Binary | $\{0, 1\}$ | 0 | 1 | Brand name token appears in path on an unrelated apex domain (e.g. `example.com/login/paypal`). | Attacker omits brand name in path. |
| 16 | `min_typosquat_dist` | Integer | $[0, 10]$ | 10 | 1 | Minimum Damerau-Levenshtein edit distance between registered domain and a bundled list of top 500 financial/tech brands. | Attacker chooses brand outside top 500. Handled by generic DOM brand checks. |

---

### 2.2 DOM & Content Features (Stage 2)

| # | Feature Name | Type | Range | Default / Missing | Stage | Description & Rationale | Evasion Risk & Mitigation |
| :- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 17 | `has_password_input` | Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Page contains `<input type="password">`. Sign of credential gateway. | Password field rendered via JS later. Caught in Stage 3 Mutation. |
| 18 | `has_email_input` | Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Page contains `<input type="email">` or user login identifier. | Generic input without email type. Analyzed via input names. |
| 19 | `has_otp_token_input` | Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Page contains 2FA/MFA token fields (OTP, authenticator code). | Custom unlabelled field. |
| 20 | `hidden_elements_count`| Integer | $[0, 100]$ | -1 (Missing) | 2 | Count of elements with `display:none`, `visibility:hidden`, or zero opacity. Phish kits use hidden overlays. | Attacker positions offscreen via CSS. Mitigated by coordinates check. |
| 21 | `iframe_count` | Integer | $[0, 50]$ | -1 (Missing) | 2 | Total `<iframe>` elements. Suspicious when used for login forms. | Form rendered directly in root document. |
| 22 | `external_scripts_ratio`| Float | $[0.0, 1.0]$ | -1 (Missing) | 2 | Ratio of `<script src="...">` loaded from foreign origin vs page origin. Cloned phish sites often load scripts from victim origin. | Attacker self-hosts all assets. |
| 23 | `external_css_ratio` | Float | $[0.0, 1.0]$ | -1 (Missing) | 2 | Ratio of `<link rel="stylesheet">` loaded from foreign origin. | Attacker inlines all CSS. |
| 24 | `external_img_ratio` | Float | $[0.0, 1.0]$ | -1 (Missing) | 2 | Ratio of `<img>` tags loaded from foreign origins (e.g., hotlinking official logos). | Attacker downloads logos locally. Handled by title/domain mismatch. |
| 25 | `favicon_origin_mismatch`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Page favicon `<link rel="icon">` origin differs from current page origin. Cloned sites frequently hotlink favicons. | Attacker hosts favicon locally. |
| 26 | `title_brand_mismatch`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Page `<title>` references a recognized brand name, but apex domain is unrelated. | Attacker leaves title blank. Empty title on auth page is itself suspicious. |
| 27 | `has_meta_refresh` | Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Document contains `<meta http-equiv="refresh">` tag. Timed client-side redirects are typical in cloaking kits. | Attacker uses JS redirection. Handled by redirect tracker. |
| 28 | `empty_anchor_ratio` | Float | $[0.0, 1.0]$ | -1 (Missing) | 2 | Ratio of `<a>` links pointing to `#`, `javascript:void(0)`, or empty targets. Phishing templates leave non-essential links broken. | Attacker mirrors real links. External link ratio checks balance this. |
| 29 | `anchor_text_url_mismatch`| Integer | $[0, 50]$ | -1 (Missing) | 2 | Count of links where visible text is a URL (e.g. "https://paypal.com") but `href` points elsewhere. | Attacker avoids raw URLs in link text. |
| 30 | `context_menu_disabled`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Detects inline listeners or event blockers for `oncontextmenu` or `selectstart`. | Attacker omits anti-inspection listeners. |
| 31 | `obfuscated_js_detected`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Page scripts exhibit high occurrences of `eval()`, `unescape()`, or chained `atob()` decoders. | Attacker uses cleartext scripts. |

---

### 2.3 Form & Submission Features (Stage 2)

| # | Feature Name | Type | Range | Default / Missing | Stage | Description & Rationale | Evasion Risk & Mitigation |
| :- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 32 | `form_action_cross_origin`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Form `action` URL destination resolves to a different registrable apex domain. Common in data-drop phish kits. | Attacker posts to local backend proxy. |
| 33 | `form_action_insecure` | Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Form `action` submits credentials over cleartext HTTP. | Attacker uses HTTPS on free SSL. Handled by cross-origin check. |
| 34 | `form_action_empty` | Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Form `action` is empty, `about:blank`, or `javascript:void(0)`. Submissions captured purely via JS events. | Valid single-page apps do this; balanced by brand/domain checks. |
| 35 | `credential_cross_post`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Form contains a password field AND submits cross-origin. Extremely high correlation with credential harvesting. | Attacker relays through local domain endpoint. |
| 36 | `sensitive_combo_detected`| Binary | $\{0, 1\}$ | -1 (Missing) | 2 | Form requests an anomalous combo of credentials: password + credit card number + SSN/ID. Characteristic of identity theft kits. | Attacker asks for password only. Handled by credential rules. |

---

### 2.4 Redirect & Navigation Features (Stage 1 & 2)

| # | Feature Name | Type | Range | Default / Missing | Stage | Description & Rationale | Evasion Risk & Mitigation |
| :- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 37 | `redirect_hop_count` | Integer | $[0, 10]$ | 0 | 1 | Number of HTTP or client redirect hops before landing. Suspicious phishing distribution chains involve 3+ hops. | Direct link distribution. |
| 38 | `redirect_cross_domain`| Binary | $\{0, 1\}$ | 0 | 1 | Redirect chain hopped across multiple distinct registrable domains. | Single-domain hop. |
| 39 | `protocol_downgraded`| Binary | $\{0, 1\}$ | 0 | 1 | Navigation path transitioned from an HTTPS origin to an insecure HTTP origin. | Attacker remains on HTTPS. |

---

### 2.5 Transport Security & TLS Features (Stage 1 & 2)

| # | Feature Name | Type | Range | Default / Missing | Stage | Description & Rationale | Evasion Risk & Mitigation |
| :- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 40 | `is_https` | Binary | $\{0, 1\}$ | 0 | 1 | Page served over secure TLS (`https://`). | Free TLS certificates are standard now. Still essential baseline. |
| 41 | `has_mixed_content` | Binary | $\{0, 1\}$ | 0 | 2 | Page loads unencrypted subresources over cleartext HTTP on an HTTPS origin. | Attacker ensures 100% HTTPS subresources. |
| 42 | `tls_validity_days` | Integer | $[-1, 1000]$| -1 (Missing) | 1 | Remaining days of certificate validity (via Firefox `getSecurityInfo` or optional CT provider; -1 if unavailable). Short-lived certs are common on ephemeral kits. | 90-day Let's Encrypt certificates are common for both benign and malicious sites. Used as weak prior. |

---

### 2.6 Reputation & User Context Features (Stage 1)

| # | Feature Name | Type | Range | Default / Missing | Stage | Description & Rationale | Evasion Risk & Mitigation |
| :- | :--- | :--- | :--- | :-: | :-: | :--- | :--- |
| 43 | `is_tranco_top_10k` | Binary | $\{0, 1\}$ | 0 | 1 | Registrable domain matches a bundled SHA-256 hash set of the Tranco top-10k global domains. Strong benign indicator. | Subdomain takeover or compromised account on reputable host. Mitigated by path & form checks. |
| 44 | `is_bloom_bad_hit` | Binary | $\{0, 1\}$ | 0 | 1 | Domain matches local compact Bloom filter of known active threats. Immediate trigger. | Zero-day attack not yet in threat feeds. ML layer handles zero-days. |
