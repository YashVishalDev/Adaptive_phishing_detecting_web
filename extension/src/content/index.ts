/**
 * TrustLens Content Script Entrypoint.
 * Isolated world execution: extracts DOM signals, monitors mutations,
 * enforces immediate client-side blocking, and communicates with the background service worker.
 */

import { TrustLensDomObserver } from "./dom-observer";

function redirectToBlockPage(url: string, score: number = 0) {
  try {
    window.stop();
  } catch {}
  try {
    if (document.documentElement) {
      document.documentElement.innerHTML = "";
    }
  } catch {}
  try {
    const interstitialUrl = chrome.runtime.getURL("src/ui/interstitial/index.html") +
      `?target=${encodeURIComponent(url)}&score=${score}`;
    window.location.replace(interstitialUrl);
  } catch (err) {
    console.error("[TrustLens] Block redirection error:", err);
  }
}

// 1. Instant document_start block check against stored denylist
function checkImmediateDenylist() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;

  // Don't intercept extension internal pages
  if (window.location.protocol === "chrome-extension:") return;

  chrome.storage.local.get(["trustlens_denylist"], (res) => {
    const denylist: string[] = Array.isArray(res?.trustlens_denylist) ? res.trustlens_denylist : [];
    if (!denylist.length) return;

    const currentHost = window.location.hostname.toLowerCase();
    const currentHref = window.location.href.toLowerCase();

    const isBlocked = denylist.some((raw) => {
      if (!raw) return false;
      let clean = raw.trim().toLowerCase();
      clean = clean.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
      if (!clean) return false;
      return currentHost === clean || currentHost.endsWith("." + clean) || currentHref.includes(clean);
    });

    if (isBlocked) {
      console.warn(`[TrustLens] Force blocking blacklisted destination: ${window.location.href}`);
      redirectToBlockPage(window.location.href, 0);
    }
  });
}

function sendDomSnapshot(stage: 2 | 3) {
  try {
    const url = window.location.href;
    const html = document.documentElement ? document.documentElement.outerHTML : "";

    chrome.runtime.sendMessage({
      type: stage === 2 ? "TRUSTLENS_STAGE_2_DOM" : "TRUSTLENS_STAGE_3_MUTATION",
      payload: {
        stage,
        url,
        html
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        return;
      }
      if (response?.verdict === "Dangerous") {
        console.warn("[TrustLens] Page evaluated as Dangerous. Enforcing immediate block redirect:", response);
        redirectToBlockPage(url, response.trustScore ?? 0);
      }
    });
  } catch (err) {
    console.debug("[TrustLens] Content script messaging skipped:", err);
  }
}

function initContentScript() {
  // Execute immediate check at document_start
  checkImmediateDenylist();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      sendDomSnapshot(2);
    });
  } else {
    sendDomSnapshot(2);
  }

  const observer = new TrustLensDomObserver({
    onCredentialMutation: () => {
      sendDomSnapshot(3);
    }
  });
  observer.start();
}

initContentScript();
