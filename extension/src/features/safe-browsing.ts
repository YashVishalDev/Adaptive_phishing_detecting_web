/**
 * TrustLens Google Safe Browsing API v4 Integration.
 * Real-time cloud threat intelligence to augment on-device ML & rule evaluation.
 */

export const DEFAULT_SAFE_BROWSING_API_KEY = "AIzaSyAHGBnKXQPMcFaAKWs38hqw56qz_iGr2yg";

export interface SafeBrowsingMatch {
  threatType: "MALWARE" | "SOCIAL_ENGINEERING" | "UNWANTED_SOFTWARE" | "POTENTIALLY_HARMFUL_APPLICATION" | string;
  platformType: string;
  threatEntryType: string;
}

export interface SafeBrowsingResult {
  checked: boolean;
  isThreat: boolean;
  threatType?: string;
  matches?: SafeBrowsingMatch[];
  rawResponse?: any;
  error?: string;
}

export class GoogleSafeBrowsingService {
  private static cache: Map<string, { result: SafeBrowsingResult; timestamp: number }> = new Map();
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute cache

  public static getApiKey(): string {
    if (typeof localStorage !== "undefined") {
      const savedKey = localStorage.getItem("trustlens_safe_browsing_key");
      if (savedKey && savedKey.trim()) return savedKey.trim();
    }
    return DEFAULT_SAFE_BROWSING_API_KEY;
  }

  public static setApiKey(key: string): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("trustlens_safe_browsing_key", key.trim());
    }
  }

  public static isEnabled(): boolean {
    if (typeof localStorage !== "undefined") {
      const enabled = localStorage.getItem("trustlens_safe_browsing_enabled");
      if (enabled !== null) return enabled === "true";
    }
    return true; // Enabled by default
  }

  public static setEnabled(enabled: boolean): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("trustlens_safe_browsing_enabled", enabled ? "true" : "false");
    }
  }

  public static async checkUrl(url: string, customApiKey?: string): Promise<SafeBrowsingResult> {
    if (!this.isEnabled()) {
      return { checked: false, isThreat: false };
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    // Check memory cache
    const cached = this.cache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.result;
    }

    const apiKey = customApiKey || this.getApiKey();
    if (!apiKey) {
      return { checked: false, isThreat: false, error: "API key missing" };
    }

    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`;

    const payload = {
      client: {
        clientId: "trustlens-cybersecurity",
        clientVersion: "1.0.0"
      },
      threatInfo: {
        threatTypes: [
          "MALWARE",
          "SOCIAL_ENGINEERING",
          "UNWANTED_SOFTWARE",
          "POTENTIALLY_HARMFUL_APPLICATION"
        ],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url: targetUrl }]
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          checked: false,
          isThreat: false,
          error: `API error HTTP ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();
      const matches: SafeBrowsingMatch[] = data?.matches || [];
      const isThreat = matches.length > 0;
      const threatType = isThreat ? matches[0].threatType : undefined;

      const result: SafeBrowsingResult = {
        checked: true,
        isThreat,
        threatType,
        matches,
        rawResponse: data
      };

      this.cache.set(targetUrl, { result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      return {
        checked: false,
        isThreat: false,
        error: err?.message || "Failed to reach Google Safe Browsing API"
      };
    }
  }
}
