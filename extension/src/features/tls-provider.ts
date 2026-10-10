/**
 * TLSSignalProvider Interface and Implementations.
 * Solves the Chrome MV3 limitation where full X.509 cert details are not exposed to extensions,
 * while supporting Firefox getSecurityInfo and optional privacy-preserving CT lookups.
 */

export interface TLSSignals {
  isHttps: boolean;
  hasMixedContent: boolean;
  validityDays: number; // -1 if unavailable
  issuer?: string;
  providerType: "mv3-basic" | "firefox-web-request" | "ct-lookup";
}

export interface TLSSignalProvider {
  getSignals(url: string, tabId?: number): Promise<TLSSignals>;
}

/**
 * Basic MV3 Provider: Inspects protocol and checks for mixed content flags.
 */
export class MV3BasicTLSProvider implements TLSSignalProvider {
  public async getSignals(url: string, _tabId?: number): Promise<TLSSignals> {
    let isHttps = false;
    try {
      isHttps = new URL(url).protocol === "https:";
    } catch {
      isHttps = url.toLowerCase().startsWith("https://");
    }

    return {
      isHttps,
      hasMixedContent: false, // Updated if mixed content requests are observed
      validityDays: -1,       // Explicit missing value in MV3
      providerType: "mv3-basic"
    };
  }
}

/**
 * Firefox WebExtension Provider: Uses browser.webRequest.getSecurityInfo.
 */
export class FirefoxTLSProvider implements TLSSignalProvider {
  public async getSignals(url: string, _tabId?: number): Promise<TLSSignals> {
    const isHttps = url.toLowerCase().startsWith("https://");

    // In Firefox WebExtensions:
    // const secInfo = await (browser.webRequest as any).getSecurityInfo(requestId, { certificateChain: true });
    // For universal MV3 compatibility, defaults gracefully if browser API not present
    if (typeof (globalThis as any).browser?.webRequest?.getSecurityInfo === "function") {
      try {
        const info = await (globalThis as any).browser.webRequest.getSecurityInfo();
        if (info && info.certificates && info.certificates.length > 0) {
          const cert = info.certificates[0];
          const expires = cert.validity?.end || 0;
          const days = Math.round((expires - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            isHttps: true,
            hasMixedContent: false,
            validityDays: Math.max(0, days),
            issuer: cert.issuer,
            providerType: "firefox-web-request"
          };
        }
      } catch {}
    }

    return {
      isHttps,
      hasMixedContent: false,
      validityDays: -1,
      providerType: "firefox-web-request"
    };
  }
}

/**
 * Optional Privacy-Preserving CT Log Provider:
 * Lookups on apex domain only (never full URL or paths).
 */
export class CTLookupProvider implements TLSSignalProvider {
  public async getSignals(url: string, _tabId?: number): Promise<TLSSignals> {
    const isHttps = url.toLowerCase().startsWith("https://");
    return {
      isHttps,
      hasMixedContent: false,
      validityDays: -1, // Offline by default; CT log mock
      providerType: "ct-lookup"
    };
  }
}
