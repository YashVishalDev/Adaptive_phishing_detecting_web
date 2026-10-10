import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncBlockRules, redirectOpenTabs } from "../src/background/block-rules";

describe("BlockRules - DeclarativeNetRequest & Tab Intervention Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("syncBlockRules", () => {
    it("should remove existing dynamic rules and register redirect rules for denylisted domains", async () => {
      const mockExistingRules = [
        { id: 101 },
        { id: 102 }
      ];

      const getDynamicRulesMock = vi.fn().mockResolvedValue(mockExistingRules);
      const updateDynamicRulesMock = vi.fn().mockResolvedValue(undefined);

      (globalThis as any).chrome = {
        declarativeNetRequest: {
          getDynamicRules: getDynamicRulesMock,
          updateDynamicRules: updateDynamicRulesMock
        }
      };

      const domainsToBlock = ["youtube.com", "https://console.firebase.google.com/u/0/"];
      await syncBlockRules(domainsToBlock);

      expect(getDynamicRulesMock).toHaveBeenCalledTimes(1);
      expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);

      const updateArgs = updateDynamicRulesMock.mock.calls[0][0];
      expect(updateArgs.removeRuleIds).toEqual([101, 102]);
      expect(updateArgs.addRules.length).toBe(2);

      // Check Rule 1: youtube.com
      const rule1 = updateArgs.addRules[0];
      expect(rule1.id).toBe(1);
      expect(rule1.priority).toBe(1);
      expect(rule1.condition.resourceTypes).toEqual(["main_frame"]);
      expect(rule1.condition.requestDomains).toEqual(["youtube.com"]);
      expect(rule1.action.type).toBe("redirect");
      expect(rule1.action.redirect.extensionPath).toContain("src/ui/interstitial/index.html");
      expect(rule1.action.redirect.extensionPath).toContain("blocked=1");
      expect(rule1.action.redirect.extensionPath).toContain("score=0");

      // Check Rule 2: console.firebase.google.com
      const rule2 = updateArgs.addRules[1];
      expect(rule2.id).toBe(2);
      expect(rule2.condition.requestDomains).toEqual(["console.firebase.google.com"]);
    });

    it("should handle empty denylist gracefully", async () => {
      const getDynamicRulesMock = vi.fn().mockResolvedValue([{ id: 1 }]);
      const updateDynamicRulesMock = vi.fn().mockResolvedValue(undefined);

      (globalThis as any).chrome = {
        declarativeNetRequest: {
          getDynamicRules: getDynamicRulesMock,
          updateDynamicRules: updateDynamicRulesMock
        }
      };

      await syncBlockRules([]);
      expect(updateDynamicRulesMock).toHaveBeenCalledWith({
        removeRuleIds: [1],
        addRules: []
      });
    });
  });

  describe("redirectOpenTabs", () => {
    it("should redirect currently open tabs matching domain or its subdomains to interstitial", async () => {
      const mockTabs = [
        { id: 1, url: "https://www.youtube.com/watch?v=test" },
        { id: 2, url: "https://m.youtube.com/feed" },
        { id: 3, url: "https://youtube.com/shorts" },
        { id: 4, url: "https://google.com/search?q=test" },
        { id: 5, url: "chrome-extension://xyz/src/ui/interstitial/index.html?target=test" }
      ];

      const queryMock = vi.fn().mockResolvedValue(mockTabs);
      const updateMock = vi.fn().mockResolvedValue(undefined);
      const getURLMock = vi.fn((path) => `chrome-extension://test-id/${path}`);

      (globalThis as any).chrome = {
        tabs: {
          query: queryMock,
          update: updateMock
        },
        runtime: {
          getURL: getURLMock
        }
      };

      await redirectOpenTabs(["youtube.com"]);

      expect(queryMock).toHaveBeenCalledWith({});
      // Tabs 1, 2, and 3 should be redirected; Tab 4 (google.com) and Tab 5 (already interstitial) should NOT be redirected
      expect(updateMock).toHaveBeenCalledTimes(3);

      expect(updateMock).toHaveBeenCalledWith(1, {
        url: expect.stringContaining("chrome-extension://test-id/src/ui/interstitial/index.html")
      });
      expect(updateMock).toHaveBeenCalledWith(2, {
        url: expect.stringContaining("chrome-extension://test-id/src/ui/interstitial/index.html")
      });
      expect(updateMock).toHaveBeenCalledWith(3, {
        url: expect.stringContaining("chrome-extension://test-id/src/ui/interstitial/index.html")
      });
    });
  });
});
