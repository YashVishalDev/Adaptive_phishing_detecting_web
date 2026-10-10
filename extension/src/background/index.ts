/**
 * TrustLens Background Service Worker Entrypoint.
 * Coordinates webNavigation hooks, content script messaging, and UI requests.
 */

import { NavigationTracker } from "./navigation-tracker";
import { ScoringOrchestrator, PageAuditReport } from "./scoring-orchestrator";

const navTracker = new NavigationTracker();
const orchestrator = new ScoringOrchestrator(navTracker);

// 1. Stage 1: Pre-navigation hook
chrome.webNavigation?.onBeforeNavigate?.addListener((details) => {
  if (details.frameId === 0 && details.url.startsWith("http")) {
    navTracker.onBeforeNavigate(details);
    orchestrator.evaluatePage(details.tabId, details.url, null, 1).catch(console.error);
  }
});

// 2. Clean up closed tabs
chrome.tabs?.onRemoved?.addListener((tabId) => {
  navTracker.cleanupTab(tabId);
});

// 3. Message handler for Content Script and UI (Popup/Options/Interstitial)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === "TRUSTLENS_STAGE_2_DOM" || message.type === "TRUSTLENS_STAGE_3_MUTATION") {
    if (!tabId || !message.payload?.url) {
      sendResponse({ error: "Invalid tab or URL" });
      return true;
    }

    const { url, html, stage } = message.payload;
    orchestrator.evaluatePage(tabId, url, html, stage).then((report) => {
      // If verdict is Dangerous, redirect to warning interstitial page
      if (report.verdict === "Dangerous" && !report.isUserOverridden) {
        const interstitialUrl = chrome.runtime.getURL("src/ui/interstitial/index.html") +
          `?target=${encodeURIComponent(url)}&score=${report.trustScore}`;
        chrome.tabs.update(tabId, { url: interstitialUrl });
      }
      sendResponse(report);
    }).catch((err) => {
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
      sendResponse({ success: true });
    }
    return true;
  }

  if (message.type === "TRUSTLENS_BLOCK_SITE") {
    const domain = message.domain;
    if (domain) {
      orchestrator.getReputationStore().addUserDeny(domain);
      sendResponse({ success: true });
    }
    return true;
  }

  if (message.type === "TRUSTLENS_SET_SENSITIVITY") {
    orchestrator.setSensitivity(message.sensitivity);
    sendResponse({ success: true });
    return true;
  }

  return false;
});

console.log("[TrustLens] Background Service Worker successfully initialized.");
