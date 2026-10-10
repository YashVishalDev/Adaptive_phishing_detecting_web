/**
 * TrustLens Navigation & Redirect Tracker.
 * Observes chrome.webNavigation events to compute redirect hops,
 * cross-domain transitions, and protocol downgrades.
 */

import { parseDomainParts } from "../features/url-extractor";

export interface TabNavContext {
  initialUrl: string;
  currentUrl: string;
  hopCount: number;
  crossDomain: boolean;
  protocolDowngraded: boolean;
  timestamp: number;
}

export class NavigationTracker {
  private tabContexts: Map<number, TabNavContext> = new Map();

  public onBeforeNavigate(details: chrome.webNavigation.WebNavigationParentedCallbackDetails): void {
    if (details.frameId !== 0) return; // Top-level frame only

    const tabId = details.tabId;
    const url = details.url;

    const existing = this.tabContexts.get(tabId);
    if (!existing) {
      this.tabContexts.set(tabId, {
        initialUrl: url,
        currentUrl: url,
        hopCount: 0,
        crossDomain: false,
        protocolDowngraded: false,
        timestamp: Date.now()
      });
    } else {
      // Additional navigation event on same tab within 5 seconds = redirect hop
      const isHop = (Date.now() - existing.timestamp) < 5000;
      if (isHop && url !== existing.currentUrl) {
        existing.hopCount++;

        const prevHost = new URL(existing.currentUrl).hostname;
        const newHost = new URL(url).hostname;
        const prevApex = parseDomainParts(prevHost).apexDomain;
        const newApex = parseDomainParts(newHost).apexDomain;

        if (prevApex && newApex && prevApex !== newApex) {
          existing.crossDomain = true;
        }

        if (existing.currentUrl.startsWith("https://") && url.startsWith("http://")) {
          existing.protocolDowngraded = true;
        }

        existing.currentUrl = url;
      } else {
        // Fresh navigation
        this.tabContexts.set(tabId, {
          initialUrl: url,
          currentUrl: url,
          hopCount: 0,
          crossDomain: false,
          protocolDowngraded: false,
          timestamp: Date.now()
        });
      }
    }
  }

  public getContext(tabId: number): TabNavContext | undefined {
    return this.tabContexts.get(tabId);
  }

  public cleanupTab(tabId: number): void {
    this.tabContexts.delete(tabId);
  }
}
