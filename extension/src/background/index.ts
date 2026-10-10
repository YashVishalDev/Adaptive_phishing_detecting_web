/**
 * TrustLens Background Service Worker Entrypoint.
 * Coordinates declarativeNetRequest rules, webNavigation hooks, content script messaging, and UI requests.
 */

import { NavigationTracker } from "./navigation-tracker";
import { ScoringOrchestrator } from "./scoring-orchestrator";
import { syncBlockRules, redirectOpenTabs } from "./block-rules";

const navTracker = new NavigationTracker();
const orchestrator = new ScoringOrchestrator(navTracker);

/**
 * Synchronizes declarative blocking rules and sweeps open tabs across all windows.
 */
export async function refreshBlocking(): Promise<void> {
  try {
    await orchestrator.getReputationStore().whenReady();
    const denylist = orchestrator.getReputationStore().getDenylist();
    await syncBlockRules(denylist);
    await redirectOpenTabs(denylist);
  } catch (err) {
    console.error("[TrustLens] refreshBlocking error:", err);
  }
}

// 1. Initialize blocking rules immediately on Service Worker startup
refreshBlocking().catch((err) => {
  console.error("[TrustLens] Initial block refresh failed:", err);
});

// 2. Stage 1: Pre-navigation hook
chrome.webNavigation?.onBeforeNavigate?.addListener((details) => {
  if (details.frameId === 0 && details.url.startsWith("http")) {
    // Avoid re-evaluating extension URLs or warning interstitial page
    if (details.url.includes("src/ui/interstitial/index.html")) return;

    // Fast synchronous check against user denylist for immediate redirect
    let hostname = "";
    try {
      hostname = new URL(details.url).hostname.toLowerCase();
    } catch {
      hostname = details.url.toLowerCase();
    }

    const denylist = orchestrator.getReputationStore().getDenylist();
    const isBlocked = denylist.some((d) => {
      const clean = d.toLowerCase().trim();
      return clean && (hostname === clean || hostname.endsWith("." + clean));
    });

    if (isBlocked) {
      const interstitialUrl =
        chrome.runtime.getURL("src/ui/interstitial/index.html") +
        `?target=${encodeURIComponent(details.url)}&score=0&blocked=1`;
      chrome.tabs.update(details.tabId, { url: interstitialUrl });
      return;
    }

    navTracker.onBeforeNavigate(details);
    orchestrator
      .evaluatePage(details.tabId, details.url, null, 1)
      .then((report) => {
        // Hard redirect if dangerous (manual user block or critical phishing verdict)
        if (report.verdict === "Dangerous") {
          const isUserBlocked = report.isUserOverridden || report.trustScore === 0;
          const interstitialUrl =
            chrome.runtime.getURL("src/ui/interstitial/index.html") +
            `?target=${encodeURIComponent(details.url)}&score=${report.trustScore}${
              isUserBlocked ? "&blocked=1" : ""
            }`;
          chrome.tabs.update(details.tabId, { url: interstitialUrl });
        }
      })
      .catch(console.error);
  }
});

// 3. SPA History State Navigation Hook (Catches in-page pushState transitions, e.g. YouTube)
chrome.webNavigation?.onHistoryStateUpdated?.addListener((details) => {
  if (details.frameId === 0 && details.url.startsWith("http")) {
    if (details.url.includes("src/ui/interstitial/index.html")) return;

    let hostname = "";
    try {
      hostname = new URL(details.url).hostname.toLowerCase();
    } catch {
      return;
    }

    const denylist = orchestrator.getReputationStore().getDenylist();
    const isBlocked = denylist.some((d) => {
      const clean = d.toLowerCase().trim();
      return clean && (hostname === clean || hostname.endsWith("." + clean));
    });

    if (isBlocked) {
      const interstitialUrl =
        chrome.runtime.getURL("src/ui/interstitial/index.html") +
        `?target=${encodeURIComponent(details.url)}&score=0&blocked=1`;
      chrome.tabs.update(details.tabId, { url: interstitialUrl });
    }
  }
});

// 4. Clean up closed tabs
chrome.tabs?.onRemoved?.addListener((tabId) => {
  navTracker.cleanupTab(tabId);
});

// 5. Message handler for Content Script and UI (Popup/Options/Interstitial)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === "TRUSTLENS_STAGE_2_DOM" || message.type === "TRUSTLENS_STAGE_3_MUTATION") {
    if (!tabId || !message.payload?.url) {
      sendResponse({ error: "Invalid tab or URL" });
      return true;
    }

    const { url, html, stage } = message.payload;
    orchestrator
      .evaluatePage(tabId, url, html, stage)
      .then((report) => {
        // If verdict is Dangerous, redirect to warning page
        if (report.verdict === "Dangerous") {
          const isUserBlocked = report.isUserOverridden || report.trustScore === 0;
          const interstitialUrl =
            chrome.runtime.getURL("src/ui/interstitial/index.html") +
            `?target=${encodeURIComponent(url)}&score=${report.trustScore}${
              isUserBlocked ? "&blocked=1" : ""
            }`;
          chrome.tabs.update(tabId, { url: interstitialUrl });
        }
        sendResponse(report);
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });

    return true; // Asynchronous response
  }

  if (message.type === "TRUSTLENS_GET_ACTIVE_REPORT") {
    const targetTabId = message.tabId || tabId;
    if (targetTabId) {
      const report = orchestrator.getCachedReport(targetTabId);
      sendResponse({ report });
    } else {
      sendResponse({ report: undefined });
    }
    return true;
  }

  if (message.type === "TRUSTLENS_TRUST_SITE") {
    const domain = message.domain;
    if (domain) {
      orchestrator.getReputationStore().addUserAllow(domain);
      refreshBlocking().then(() => {
        sendResponse({ success: true });
      }).catch(() => {
        sendResponse({ success: true });
      });
      return true;
    }
    sendResponse({ success: false });
    return true;
  }

  if (message.type === "TRUSTLENS_BLOCK_SITE") {
    const domain = message.domain;
    if (domain) {
      orchestrator.getReputationStore().addUserDeny(domain);
      refreshBlocking().then(() => {
        sendResponse({ success: true });
      }).catch(() => {
        sendResponse({ success: true });
      });
      return true;
    }
    sendResponse({ success: false });
    return true;
  }

  if (message.type === "TRUSTLENS_REMOVE_OVERRIDE") {
    const domain = message.domain;
    if (domain) {
      orchestrator.getReputationStore().removeUserOverride(domain);
      refreshBlocking().then(() => {
        sendResponse({ success: true });
      }).catch(() => {
        sendResponse({ success: true });
      });
      return true;
    }
    sendResponse({ success: false });
    return true;
  }

  if (message.type === "TRUSTLENS_SET_SENSITIVITY") {
    orchestrator.setSensitivity(message.sensitivity);
    sendResponse({ success: true });
    return true;
  }

  return false;
});

console.log("[TrustLens] Background Service Worker successfully initialized with DNR support.");
