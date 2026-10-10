import { describe, it, expect } from "vitest";
import { CompactBloomFilter, ReputationStore } from "../src/features/reputation-store";
import { MV3BasicTLSProvider } from "../src/features/tls-provider";
import { NavigationTracker } from "../src/background/navigation-tracker";

describe("TrustLens Reputation, TLS & Navigation Tracking", () => {
  it("verifies CompactBloomFilter membership, false negative rate (0%), and serialization", () => {
    const filter = new CompactBloomFilter(1024, 3);
    filter.add("evil-phishing-1.com");
    filter.add("evil-phishing-2.xyz");

    // True positives (Bloom filters never have false negatives)
    expect(filter.has("evil-phishing-1.com")).toBe(true);
    expect(filter.has("evil-phishing-2.xyz")).toBe(true);

    // Serialization to Base64
    const b64 = filter.exportBase64();
    expect(b64.length).toBeGreaterThan(0);

    const filter2 = new CompactBloomFilter(1024, 3);
    filter2.loadBase64(b64);
    expect(filter2.has("evil-phishing-1.com")).toBe(true);
    expect(filter2.has("evil-phishing-2.xyz")).toBe(true);
  });

  it("verifies ReputationStore Tranco matching and user overrides", () => {
    const store = new ReputationStore();

    // Known Tranco top domain
    expect(store.isTrancoTop10k("www.google.com")).toBe(true);
    expect(store.isTrancoTop10k("portal.github.com")).toBe(true);
    expect(store.isTrancoTop10k("unrecognized-new-domain.top")).toBe(false);

    // Seed threat in bloom
    expect(store.isBloomBadHit("paypal-security-update.xyz")).toBe(true);

    // User allowlist / denylist
    expect(store.getUserTrustStatus("custom-safe.internal")).toBe(0);
    store.addUserAllow("custom-safe.internal");
    expect(store.getUserTrustStatus("custom-safe.internal")).toBe(1);

    store.addUserDeny("custom-blocked.biz");
    expect(store.getUserTrustStatus("custom-blocked.biz")).toBe(-1);
  });

  it("verifies MV3BasicTLSProvider protocol extraction", async () => {
    const provider = new MV3BasicTLSProvider();
    const secureSignals = await provider.getSignals("https://mybank.com/dashboard");
    expect(secureSignals.isHttps).toBe(true);
    expect(secureSignals.validityDays).toBe(-1); // Explicit missing value in MV3

    const insecureSignals = await provider.getSignals("http://unencrypted.site");
    expect(insecureSignals.isHttps).toBe(false);
  });

  it("tracks redirect hops and cross-domain transitions in NavigationTracker", () => {
    const tracker = new NavigationTracker();
    const tabId = 42;

    // First navigation
    tracker.onBeforeNavigate({
      tabId,
      url: "https://bit.ly/short-link",
      frameId: 0,
      parentFrameId: -1,
      processId: 1,
      timeStamp: Date.now()
    });

    let ctx = tracker.getContext(tabId);
    expect(ctx?.hopCount).toBe(0);
    expect(ctx?.crossDomain).toBe(false);

    // Immediate redirect to intermediate gateway
    tracker.onBeforeNavigate({
      tabId,
      url: "https://gateway-router.com/track",
      frameId: 0,
      parentFrameId: -1,
      processId: 1,
      timeStamp: Date.now() + 100
    });

    ctx = tracker.getContext(tabId);
    expect(ctx?.hopCount).toBe(1);
    expect(ctx?.crossDomain).toBe(true);
  });
});
