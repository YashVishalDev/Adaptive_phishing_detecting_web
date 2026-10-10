import { describe, it, expect } from "vitest";
import { UrlScanner } from "../src/engine/url-scanner";
import { ReputationStore } from "../src/features/reputation-store";

describe("UrlScanner Engine", () => {
  it("should evaluate benign top domain as Safe", () => {
    const scanner = new UrlScanner();
    const result = scanner.scan("https://www.google.com");
    expect(result.verdict).toBe("Safe");
    expect(result.trustScore).toBeGreaterThanOrEqual(75);
    expect(result.signals.isTrancoTop).toBe(true);
    expect(result.signals.isHttps).toBe(true);
  });

  it("should evaluate phishing domain with suspicious TLD and brand impersonation as Dangerous", () => {
    const scanner = new UrlScanner();
    const result = scanner.scan("http://paypal-security-update.xyz/login/verify");
    expect(result.verdict).toBe("Dangerous");
    expect(result.trustScore).toBeLessThan(40);
    expect(result.signals.suspiciousTld).toBe(true);
    expect(result.signals.isHttps).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("should detect IP address hostname and port anomaly", () => {
    const scanner = new UrlScanner();
    const result = scanner.scan("http://192.168.1.55:8080/bank/login");
    expect(result.signals.isIpHost).toBe(true);
    expect(result.signals.portAnomaly).toBe(true);
    expect(result.signals.port).toBe(8080);
    expect(result.verdict).not.toBe("Safe");
  });

  it("should detect brand typosquatting", () => {
    const scanner = new UrlScanner();
    const result = scanner.scan("http://amaz0n-security.com/account");
    expect(result.signals.minTyposquatDist).toBeLessThanOrEqual(2);
    expect(result.signals.matchedBrand).toBe("amazon");
  });

  it("should respect user allowlist and denylist overrides", () => {
    const repStore = new ReputationStore();
    repStore.addUserAllow("my-trusted-site.xyz");
    repStore.addUserDeny("bad-domain.com");

    const scanner = new UrlScanner(repStore);

    const allowed = scanner.scan("http://my-trusted-site.xyz/app");
    expect(allowed.trustScore).toBe(100);
    expect(allowed.verdict).toBe("Safe");
    expect(allowed.isUserOverridden).toBe(true);

    const blocked = scanner.scan("https://bad-domain.com/hello");
    expect(blocked.trustScore).toBe(0);
    expect(blocked.verdict).toBe("Dangerous");
    expect(blocked.isUserOverridden).toBe(true);
  });

  it("should normalize full URLs like https://console.firebase.google.com/u/0/ and enforce hard block", () => {
    const repStore = new ReputationStore();
    // User enters a full URL with scheme and path into blocklist
    repStore.addUserDeny("https://console.firebase.google.com/u/0/");

    const scanner = new UrlScanner(repStore);

    // 1. Scan exact link
    const exactScan = scanner.scan("https://console.firebase.google.com/u/0/");
    expect(exactScan.trustScore).toBe(0);
    expect(exactScan.verdict).toBe("Dangerous");
    expect(exactScan.isUserOverridden).toBe(true);
    expect(exactScan.reasons[0].id).toBe("USER_BLOCKED_OVERRIDE");

    // 2. Scan child path under the blocked domain
    const subPathScan = scanner.scan("https://console.firebase.google.com/project/my-database/settings");
    expect(subPathScan.trustScore).toBe(0);
    expect(subPathScan.verdict).toBe("Dangerous");
    expect(subPathScan.isUserOverridden).toBe(true);
  });
});
