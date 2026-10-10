/**
 * TrustLens Content Script Entrypoint.
 * Isolated world execution: extracts DOM signals, monitors mutations,
 * and communicates with the background service worker without exposing APIs to the page.
 */

import { TrustLensDomObserver } from "./dom-observer";

function sendDomSnapshot(stage: 2 | 3) {
  try {
    const url = window.location.href;
    // Extract sanitized HTML structure (elements, attributes, links, scripts)
    const html = document.documentElement.outerHTML;

    chrome.runtime.sendMessage({
      type: stage === 2 ? "TRUSTLENS_STAGE_2_DOM" : "TRUSTLENS_STAGE_3_MUTATION",
      payload: {
        stage,
        url,
        html
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Service worker may be sleeping or context invalid
        return;
      }
      if (response?.verdict === "Dangerous") {
        console.warn("[TrustLens] Page evaluated as Dangerous:", response);
      }
    });
  } catch (err) {
    console.debug("[TrustLens] Content script messaging skipped:", err);
  }
}

function initContentScript() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      sendDomSnapshot(2);
    });
  } else {
    // DOM is already parsed
    sendDomSnapshot(2);
  }

  // Start debounced mutation observer for Stage 3 dynamic injections
  const observer = new TrustLensDomObserver({
    onCredentialMutation: () => {
      sendDomSnapshot(3);
    }
  });
  observer.start();
}

initContentScript();
