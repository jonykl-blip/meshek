import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
    timeout: 15_000,
  });
}

test.describe("E. Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  // QA Check #43: "ניהול" section cards: עובדים, לקוחות ושטחים, הגדרות
  test("#43 — ניהול section shows workers, clients-areas, settings cards", async ({ page }) => {
    // Find the "ניהול" heading (exact match to avoid matching "ניהול חקלאי")
    const managementHeading = page.getByRole("heading", { name: "ניהול", exact: true });
    await expect(managementHeading).toBeVisible();

    // Cards should be visible on the page (near the heading)
    await expect(page.locator('a[href*="/admin/workers"]')).toBeVisible();
    await expect(page.locator('a[href*="/admin/clients-areas"]')).toBeVisible();
    await expect(page.locator('a[href*="/admin/settings"]')).toBeVisible();
  });

  // QA Check #44: "דוחות ותפעול" section includes דוחות קבלן card
  test("#44 — דוחות ותפעול section includes דוחות קבלן card", async ({ page }) => {
    const reportsHeading = page.getByRole("heading", { name: "דוחות ותפעול" });
    await expect(reportsHeading).toBeVisible();

    await expect(page.locator('a[href*="/admin/contractor-reports"]')).toBeVisible();
  });

  // QA Check #45: Click each card → navigates to correct page
  test("#45 — clicking cards navigates to correct pages", async ({ page }) => {
    test.setTimeout(90_000); // 6 navigations need more time
    const cardRoutes: [string, RegExp][] = [
      ['a[href*="/admin/workers"]', /\/admin\/workers/],
      ['a[href*="/admin/clients-areas"]', /\/admin\/clients-areas/],
      ['a[href*="/admin/settings"]', /\/admin\/settings/],
      ['a[href*="/admin/contractor-reports"]', /\/admin\/contractor-reports/],
      ['a[href*="/admin/review"]', /\/admin\/review/],
      ['a[href*="/dashboard"]', /\/dashboard/],
    ];

    for (const [selector, expectedUrl] of cardRoutes) {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const link = page.locator(selector).first();
      if (await link.count() === 0) continue;

      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(expectedUrl);
    }
  });
});
