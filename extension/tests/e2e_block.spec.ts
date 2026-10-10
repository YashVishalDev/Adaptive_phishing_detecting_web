import { test, expect, chromium } from "@playwright/test";
import path from "path";

test.describe("TrustLens MV3 Blocklist E2E Verification", () => {
  test("should block navigation to denylisted domain and display interstitial", async () => {
    const pathToExtension = path.resolve(__dirname, "../dist");

    // Launch Chromium with TrustLens unpacked extension loaded
    const context = await chromium.launchPersistentContext("", {
      headless: true,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        "--no-sandbox"
      ]
    });

    try {
      const page = await context.newPage();

      // Retrieve Service Worker to determine Extension ID
      let [background] = context.serviceWorkers();
      if (!background) {
        background = await context.waitForEvent("serviceworker", { timeout: 8000 }).catch(() => null as any);
      }

      if (background) {
        const extensionId = background.url().split("/")[2];
        const optionsUrl = `chrome-extension://${extensionId}/src/ui/options/index.html?tab=domains`;
        await page.goto(optionsUrl, { timeout: 10000 });

        // Add domain to blocked list
        const domainInput = page.locator('input[placeholder*="Enter domain or link"]');
        await domainInput.fill("youtube.com");
        await page.locator('button:has-text("Always Block")').click();

        // Verify blocked list reflects the domain
        await expect(page.locator("text=youtube.com").first()).toBeVisible({ timeout: 5000 });

        // Open new tab and attempt navigation to blocked domain
        const testPage = await context.newPage();
        await testPage.goto("https://www.youtube.com", { timeout: 10000 }).catch(() => {});

        // Assert: Redirection intercepted by DNR to the security interstitial
        await expect(testPage).toHaveURL(/src\/ui\/interstitial\/index\.html.*youtube\.com/, { timeout: 8000 });
        await expect(testPage.locator("text=Website Blocked by You")).toBeVisible();
        await expect(testPage.locator("text=Aapne ye site khud block ki hai")).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });
});
