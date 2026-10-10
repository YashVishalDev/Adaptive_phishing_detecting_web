import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GoogleSafeBrowsingService,
  DEFAULT_SAFE_BROWSING_API_KEY
} from "../src/features/safe-browsing";

describe("GoogleSafeBrowsingService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have the default Google Safe Browsing API key configured", () => {
    expect(DEFAULT_SAFE_BROWSING_API_KEY).toBe("AIzaSyAHGBnKXQPMcFaAKWs38hqw56qz_iGr2yg");
    expect(GoogleSafeBrowsingService.getApiKey()).toBe("AIzaSyAHGBnKXQPMcFaAKWs38hqw56qz_iGr2yg");
  });

  it("should correctly identify threats from API response payload", async () => {
    const mockResponse = {
      matches: [
        {
          threatType: "SOCIAL_ENGINEERING",
          platformType: "ANY_PLATFORM",
          threatEntryType: "URL",
          threat: { url: "http://malicious-test-scam.com" }
        }
      ]
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse
    } as any);

    const result = await GoogleSafeBrowsingService.checkUrl("http://malicious-test-scam.com");

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.checked).toBe(true);
    expect(result.isThreat).toBe(true);
    expect(result.threatType).toBe("SOCIAL_ENGINEERING");
    expect(result.matches?.length).toBe(1);
  });

  it("should return clean result when API response has no matches", async () => {
    const mockResponse = {}; // Empty matches means clean

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse
    } as any);

    const result = await GoogleSafeBrowsingService.checkUrl("https://benign-clean-site.org");

    expect(result.checked).toBe(true);
    expect(result.isThreat).toBe(false);
    expect(result.threatType).toBeUndefined();
  });

  it("should cache results and avoid redundant network calls within TTL", async () => {
    const mockResponse = {};

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    } as any);

    const url = "https://cached-test-domain.edu";
    const res1 = await GoogleSafeBrowsingService.checkUrl(url);
    const callCountAfterFirst = fetchSpy.mock.calls.length;

    const res2 = await GoogleSafeBrowsingService.checkUrl(url);
    expect(fetchSpy.mock.calls.length).toBe(callCountAfterFirst);
    expect(res2.checked).toBe(true);
    expect(res2.isThreat).toBe(res1.isThreat);
  });

  it("should gracefully handle network error without throwing exception", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const result = await GoogleSafeBrowsingService.checkUrl("https://offline-error-test.com");
    expect(result.checked).toBe(false);
    expect(result.isThreat).toBe(false);
    expect(result.error).toContain("Network timeout");
  });
});
