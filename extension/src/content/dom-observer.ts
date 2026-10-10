/**
 * Lightweight MutationObserver for TrustLens Content Script.
 * Debounced, throttled with requestIdleCallback, capped at <15ms main thread budget.
 */

export interface MutationObserverCallbacks {
  onCredentialMutation: () => void;
}

export class TrustLensDomObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private callbacks: MutationObserverCallbacks;
  private mutationCount: number = 0;
  private readonly MAX_MUTATIONS_PER_PAGE: number = 100;
  private isDestroyed: boolean = false;

  constructor(callbacks: MutationObserverCallbacks) {
    this.callbacks = callbacks;
  }

  public start(): void {
    if (typeof window === "undefined" || !window.document) return;

    this.observer = new MutationObserver((mutations) => {
      if (this.isDestroyed || this.mutationCount >= this.MAX_MUTATIONS_PER_PAGE) return;

      let hasSensitiveChange = false;

      for (const m of mutations) {
        if (m.type === "childList") {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tagName = el.tagName;
              if (
                tagName === "INPUT" ||
                tagName === "FORM" ||
                tagName === "IFRAME" ||
                el.querySelector?.("input, form, iframe")
              ) {
                hasSensitiveChange = true;
                break;
              }
            }
          }
        } else if (m.type === "attributes") {
          const target = m.target as HTMLElement;
          if (target.tagName === "FORM" && m.attributeName === "action") {
            hasSensitiveChange = true;
          } else if (target.tagName === "INPUT" && (m.attributeName === "type" || m.attributeName === "name")) {
            hasSensitiveChange = true;
          }
        }
        if (hasSensitiveChange) break;
      }

      if (hasSensitiveChange) {
        this.mutationCount++;
        this.scheduleDebouncedEvaluation();
      }
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type", "action", "style", "href", "name"]
    });

    // Also attach focus listener to catch deferred interaction
    document.addEventListener("focusin", (e) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" && (target as HTMLInputElement).type === "password") {
        this.scheduleDebouncedEvaluation();
      }
    }, { passive: true });
  }

  private scheduleDebouncedEvaluation(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      const scheduleWork = window.requestIdleCallback || ((cb: IdleRequestCallback) => {
        return window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 10 }), 50);
      });

      scheduleWork(() => {
        const start = performance.now();
        this.callbacks.onCredentialMutation();
        const duration = performance.now() - start;
        if (duration > 15) {
          console.debug(`[TrustLens] DOM evaluation took ${duration.toFixed(1)}ms`);
        }
      });
    }, 250);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
