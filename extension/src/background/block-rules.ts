/**
 * TrustLens Declarative Net Request (DNR) & Tab Intervention Engine.
 * Provides instantaneous, hardware-accelerated network interception for user-blocked domains
 * and forces already-open tabs to the warning interstitial.
 */

import { extractCleanDomain } from "../features/reputation-store";

/**
 * Synchronizes Chrome's dynamic declarativeNetRequest rules with the provided denylist.
 * Purges obsolete rules and establishes main_frame redirect rules.
 */
export async function syncBlockRules(domains: string[]): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.declarativeNetRequest) {
    return;
  }

  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);

    // Normalize and deduplicate domains
    const uniqueDomains = Array.from(
      new Set(
        domains
          .map((d) => extractCleanDomain(d))
          .filter((d): d is string => Boolean(d && d.length > 0))
      )
    );

    const addRules: chrome.declarativeNetRequest.Rule[] = uniqueDomains.map((domain, index) => {
      const targetUrl = `https://${domain}`;
      const extensionPath = `/src/ui/interstitial/index.html?target=${encodeURIComponent(targetUrl)}&score=0&blocked=1`;

      return {
        id: index + 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            extensionPath
          }
        },
        condition: {
          requestDomains: [domain],
          resourceTypes: ["main_frame"]
        }
      };
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });

    console.log(
      `[TrustLens DNR] Synchronized ${addRules.length} dynamic redirect rule(s) (removed ${removeRuleIds.length} prior rules).`
    );
  } catch (err) {
    console.error("[TrustLens DNR] Error synchronizing declarative rules:", err);
  }
}

/**
 * Queries all active and background tabs across all windows and redirects
 * any currently open tab whose hostname matches a blocked domain.
 */
export async function redirectOpenTabs(domains: string[]): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    return;
  }

  try {
    const cleanBlocked = Array.from(
      new Set(
        domains
          .map((d) => extractCleanDomain(d))
          .filter((d): d is string => Boolean(d && d.length > 0))
      )
    );

    if (cleanBlocked.length === 0) return;

    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      // Do not redirect extension internal pages or interstitial itself
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.includes("src/ui/interstitial/index.html")
      ) {
        continue;
      }

      let hostname = "";
      try {
        hostname = new URL(tab.url).hostname.toLowerCase();
      } catch {
        continue;
      }

      const isMatch = cleanBlocked.some(
        (blocked) => hostname === blocked || hostname.endsWith("." + blocked)
      );

      if (isMatch) {
        const interstitialUrl =
          chrome.runtime.getURL("src/ui/interstitial/index.html") +
          `?target=${encodeURIComponent(tab.url)}&score=0&blocked=1`;

        await chrome.tabs.update(tab.id, { url: interstitialUrl });
        console.log(`[TrustLens] Redirected open tab ${tab.id} (${hostname}) to interstitial.`);
      }
    }
  } catch (err) {
    console.error("[TrustLens] Error redirecting open tabs:", err);
  }
}
