# ADR 0002: Declarative Net Request (DNR) for Enforcing User Blocklist in Manifest V3

**Status:** Accepted  
**Date:** October 2026  
**Deciders:** Core Engineering Team (Code Warriors)

## Context
TrustLens provides users with the ability to define custom "Blocked Domains" (denylist) via the options settings and link scanner UI. Previously, blocking was handled purely reactively in the background service worker:
1. `chrome.webNavigation.onBeforeNavigate` received navigation events.
2. The orchestrator asynchronously evaluated the domain.
3. If dangerous or blocked, `chrome.tabs.update(tabId, { url: interstitialUrl })` was called.

In Chrome Manifest V3, this reactive pattern failed to reliably block destinations because:
- **Informational Nature of `webNavigation`:** `webNavigation` does not pause or intercept network transport. The browser initiates DNS resolution, TLS handshakes, and HTTP requests in parallel while background scripts evaluate asynchronous promises. By the time `chrome.tabs.update()` fired, the target website had already loaded its DOM, scripts, or service workers.
- **Single Page Applications (SPAs):** Platforms such as YouTube rely heavily on client-side routing (`history.pushState` / `history.replaceState`). `onBeforeNavigate` only fires on full-page top-level document loads, allowing users to navigate internally without triggering the interceptor.
- **Open Tabs Race:** Domains added to the blocklist while an active tab was already displaying that site remained interactive indefinitely until manually refreshed.

## Decision
We chose to adopt **Chrome Declarative Net Request (`chrome.declarativeNetRequest`) dynamic rules combined with active tab sweeps and SPA navigation hooks**:

1. **Native DNR Dynamic Rules (`chrome.declarativeNetRequest.updateDynamicRules`):**
   - Each domain in the denylist is converted into a native browser dynamic rule with:
     - `condition.requestDomains: [domain]` (which natively covers apex domain and all subdomains, including `www.` and `m.`).
     - `condition.resourceTypes: ["main_frame"]`.
     - `action.type: "redirect"`, routing directly to `/src/ui/interstitial/index.html?target=...&score=0&blocked=1`.
   - The Chrome network stack enforces this rule synchronously in C++ prior to sending TCP/HTTP packets, guaranteeing zero network leakage.

2. **Open Tab Interceptor (`redirectOpenTabs`):**
   - Upon blocklist modification, `chrome.tabs.query({})` audits all open tabs. Any tab currently open to the blocked domain or its subdomains is immediately updated to the TrustLens warning interstitial.

3. **SPA History State Interception:**
   - A `chrome.webNavigation.onHistoryStateUpdated` listener catches in-page pushState navigations and halts navigation to denylisted paths.

4. **Interstitial Hardening:**
   - The warning interstitial differentiates between AI-detected phishing (which permits a 5-second friction override) and manual user blocks. For manual user blocks, the "Proceed Anyway" button is disabled/hidden to prevent accidental deletion of user security policies.

## Consequences
- **Positive:** True zero-latency blocking. Network requests never egress, and pages never flash or render before being blocked.
- **Positive:** Subdomain coverage is automatic (e.g., blocking `youtube.com` instantly protects `www.youtube.com`, `m.youtube.com`, etc.).
- **Positive:** Dynamic rules persist across service worker idle states and browser restarts.
- **Positive:** Already-open tabs are neutralized immediately upon adding a block.
- **Negative:** Requires `"declarativeNetRequest"` and `"tabs"` permissions in `manifest.json`. These permissions are standard for privacy/security extensions and justifiable under Chrome Web Store security review.
