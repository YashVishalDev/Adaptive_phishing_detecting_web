/**
 * TrustLens Reputation Store.
 * Fast local reputation lookup:
 * 1. Compact Bloom filter for known malicious domains
 * 2. Bundled Tranco top-10k hash set for established benign domains
 * 3. User allowlist / blocklist overrides with persistence and subdomain matching
 */

import { parseDomainParts } from "./url-extractor";

export function extractCleanDomain(input: string): string {
  if (!input) return "";
  let clean = input.trim().toLowerCase();
  try {
    if (!/^https?:\/\//i.test(clean)) {
      clean = "http://" + clean;
    }
    const u = new URL(clean);
    return u.hostname.toLowerCase().trim();
  } catch {
    return clean
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .split(":")[0]
      .trim();
  }
}

export class CompactBloomFilter {
  private size: number;
  private hashCount: number;
  private bitArray: Uint8Array;

  constructor(sizeBits: number = 65536, hashCount: number = 4) {
    this.size = sizeBits;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(sizeBits / 8));
  }

  private hash(str: string, seed: number): number {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % this.size;
  }

  public add(item: string): void {
    const clean = item.toLowerCase().trim();
    for (let i = 0; i < this.hashCount; i++) {
      const bitIndex = this.hash(clean, i);
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitArray[byteIndex] |= (1 << bitOffset);
    }
  }

  public has(item: string): boolean {
    const clean = item.toLowerCase().trim();
    for (let i = 0; i < this.hashCount; i++) {
      const bitIndex = this.hash(clean, i);
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false;
      }
    }
    return true;
  }

  public exportBase64(): string {
    let binary = "";
    for (let i = 0; i < this.bitArray.length; i++) {
      binary += String.fromCharCode(this.bitArray[i]);
    }
    return btoa(binary);
  }

  public loadBase64(base64: string): void {
    const binary = atob(base64);
    this.bitArray = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      this.bitArray[i] = binary.charCodeAt(i);
    }
    this.size = this.bitArray.length * 8;
  }
}

export class ReputationStore {
  private bloomBad: CompactBloomFilter;
  private trancoTopDomains: Set<string>;
  private userAllowlist: Set<string>;
  private userDenylist: Set<string>;
  private loadPromise: Promise<void>;

  constructor() {
    this.bloomBad = new CompactBloomFilter(16384, 3);
    this.trancoTopDomains = new Set([
      "google.com", "microsoft.com", "apple.com", "amazon.com", "github.com",
      "wikipedia.org", "cloudflare.com", "mozilla.org", "python.org", "stackoverflow.com",
      "linkedin.com", "nytimes.com", "cnn.com", "bbc.co.uk", "reddit.com",
      "medium.com", "dropbox.com", "slack.com", "zoom.us", "salesforce.com",
      "spotify.com", "adobe.com", "craigslist.org", "etsy.com", "ebay.com",
      "walmart.com", "target.com", "bestbuy.com", "nih.gov", "cdc.gov",
      "mit.edu", "stanford.edu", "harvard.edu", "berkeley.edu", "cmu.edu",
      "paypal.com", "chase.com", "bankofamerica.com", "wellsfargo.com", "citibank.com"
    ]);
    this.userAllowlist = new Set<string>();
    this.userDenylist = new Set<string>();

    // Seed sample bad domains into local Bloom filter
    const sampleThreats = [
      "paypal-security-update.xyz", "login-bankofamerica.top",
      "drop-box-receiver.xyz", "gate-logger-auth.top", "temp-storage-bucket.loan",
      "auth-exfil-sink.click", "secure-drop-node.work", "credential-receiver.buzz"
    ];
    for (const t of sampleThreats) {
      this.bloomBad.add(t);
    }

    this.loadPromise = this.initStorage();
  }

  public async whenReady(): Promise<void> {
    await this.loadPromise;
  }

  private initStorage(): Promise<void> {
    // 1. Synchronously load from localStorage first (for instant availability in web & UI)
    if (typeof localStorage !== "undefined") {
      try {
        const a = localStorage.getItem("trustlens_allowlist");
        const d = localStorage.getItem("trustlens_denylist");
        if (a) {
          const parsed = JSON.parse(a);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              const clean = extractCleanDomain(item);
              if (clean) this.userAllowlist.add(clean);
            });
          }
        }
        if (d) {
          const parsed = JSON.parse(d);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              const clean = extractCleanDomain(item);
              if (clean) this.userDenylist.add(clean);
            });
          }
        }
      } catch {}
    }

    // 2. Also load from chrome.storage.local if available (extension background / options)
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      return new Promise<void>((resolve) => {
        try {
          chrome.storage.local.get(["trustlens_allowlist", "trustlens_denylist"], (res) => {
            if (Array.isArray(res?.trustlens_allowlist)) {
              for (const d of res.trustlens_allowlist) {
                const clean = extractCleanDomain(d);
                if (clean) this.userAllowlist.add(clean);
              }
            }
            if (Array.isArray(res?.trustlens_denylist)) {
              for (const d of res.trustlens_denylist) {
                const clean = extractCleanDomain(d);
                if (clean) this.userDenylist.add(clean);
              }
            }
            resolve();
          });
        } catch {
          resolve();
        }
      });
    }

    return Promise.resolve();
  }

  private persistStorage(): void {
    const allowArr = Array.from(this.userAllowlist);
    const denyArr = Array.from(this.userDenylist);

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("trustlens_allowlist", JSON.stringify(allowArr));
        localStorage.setItem("trustlens_denylist", JSON.stringify(denyArr));
      } catch {}
    }

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      try {
        chrome.storage.local.set({
          trustlens_allowlist: allowArr,
          trustlens_denylist: denyArr
        });
      } catch {}
    }
  }

  public isTrancoTop10k(hostname: string): boolean {
    const cleanHost = extractCleanDomain(hostname);
    const { apexDomain } = parseDomainParts(cleanHost);
    return this.trancoTopDomains.has(apexDomain) || this.trancoTopDomains.has(cleanHost);
  }

  public isBloomBadHit(hostname: string): boolean {
    const cleanHost = extractCleanDomain(hostname);
    const { apexDomain } = parseDomainParts(cleanHost);
    return this.bloomBad.has(cleanHost) || (apexDomain ? this.bloomBad.has(apexDomain) : false);
  }

  public getUserTrustStatus(hostname: string): -1 | 0 | 1 {
    const cleanHost = extractCleanDomain(hostname);
    if (!cleanHost) return 0;
    const { apexDomain } = parseDomainParts(cleanHost);

    // 1. Direct match on full hostname or apexDomain
    if (this.userDenylist.has(cleanHost) || (apexDomain && this.userDenylist.has(apexDomain))) {
      return -1;
    }
    if (this.userAllowlist.has(cleanHost) || (apexDomain && this.userAllowlist.has(apexDomain))) {
      return 1;
    }

    // 2. Subdomain wildcard match (e.g. if user blocks "firebase.google.com" or "google.com", any subdomain or URL under it is blocked)
    for (const rawBlocked of this.userDenylist) {
      const blocked = extractCleanDomain(rawBlocked);
      if (!blocked) continue;
      if (cleanHost === blocked || cleanHost.endsWith("." + blocked)) {
        return -1;
      }
    }

    for (const rawAllowed of this.userAllowlist) {
      const allowed = extractCleanDomain(rawAllowed);
      if (!allowed) continue;
      if (cleanHost === allowed || cleanHost.endsWith("." + allowed)) {
        return 1;
      }
    }

    return 0;
  }

  public addUserAllow(rawDomain: string): void {
    const clean = extractCleanDomain(rawDomain);
    if (!clean) return;
    this.userAllowlist.add(clean);
    this.userDenylist.delete(clean);
    // Also remove any entries that normalize to clean
    for (const d of this.userDenylist) {
      if (extractCleanDomain(d) === clean) this.userDenylist.delete(d);
    }
    this.persistStorage();
  }

  public addUserDeny(rawDomain: string): void {
    const clean = extractCleanDomain(rawDomain);
    if (!clean) return;
    this.userDenylist.add(clean);
    this.userAllowlist.delete(clean);
    // Also remove any entries that normalize to clean
    for (const d of this.userAllowlist) {
      if (extractCleanDomain(d) === clean) this.userAllowlist.delete(d);
    }
    this.persistStorage();
  }

  public removeUserOverride(rawDomain: string): void {
    const clean = extractCleanDomain(rawDomain);
    if (!clean) return;
    this.userAllowlist.delete(clean);
    this.userDenylist.delete(clean);
    for (const d of this.userAllowlist) {
      if (extractCleanDomain(d) === clean) this.userAllowlist.delete(d);
    }
    for (const d of this.userDenylist) {
      if (extractCleanDomain(d) === clean) this.userDenylist.delete(d);
    }
    this.persistStorage();
  }

  public getAllowlist(): string[] {
    return Array.from(this.userAllowlist);
  }

  public getDenylist(): string[] {
    return Array.from(this.userDenylist);
  }
}
