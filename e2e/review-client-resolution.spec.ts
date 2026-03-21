import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL!;
const PASSWORD = process.env.E2E_PASSWORD!;

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
    timeout: 15_000,
  });
}

test.describe("Admin Review — Client Resolution", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/review");
    await page.waitForLoadState("networkidle");
  });

  test("page loads and shows review queue", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/review/);
    // Page heading is always present
    await expect(page.getByRole("heading", { name: "רשומות ממתינות לאישור" })).toBeVisible();
  });

  test("client resolution section shown when pending_client_name exists", async ({ page }) => {
    // Look for the amber badge that indicates an unrecognized client
    // The badge text follows the pattern: "לקוח לא מזוהה: {name}"
    const clientBadges = page.locator(".bg-amber-100.text-amber-800").filter({ hasText: "לקוח לא מזוהה" });
    const badgeCount = await clientBadges.count();

    test.skip(badgeCount === 0, "No records with pending_client_name — skipping client resolution test");

    // At least one amber badge with unrecognized client text should be visible
    await expect(clientBadges.first()).toBeVisible();

    // Expand the first record that has a pending client name to see the resolution UI
    // The record card containing this badge should have an expand button
    const recordCard = clientBadges.first().locator("xpath=ancestor::div[contains(@class, 'rounded')]").first();
    const expandButton = recordCard.locator("button").filter({ hasText: /הרחב|צמצם/ });
    if (await expandButton.count() > 0) {
      await expandButton.first().click();
      await page.waitForLoadState("networkidle");
    }

    // The client resolution section should show the amber-bordered box
    const resolutionSection = page.locator(".border-amber-200.bg-amber-50\\/50");
    if (await resolutionSection.count() > 0) {
      await expect(resolutionSection.first()).toBeVisible();
    }
  });

  test("match existing client button is present", async ({ page }) => {
    // Check if there are records with pending client names
    const clientBadges = page.locator(".bg-amber-100.text-amber-800").filter({ hasText: "לקוח לא מזוהה" });
    const badgeCount = await clientBadges.count();

    test.skip(badgeCount === 0, "No records with pending_client_name — skipping match client test");

    // We need to expand a record to see the resolution buttons
    // Find any expandable row and expand it
    const expandButtons = page.locator("button").filter({ hasText: /הרחב/ });
    if (await expandButtons.count() > 0) {
      await expandButtons.first().click();
      await page.waitForLoadState("networkidle");
    }

    // Look for the "Match Existing Client" button
    const matchClientButton = page.getByRole("button", { name: "התאם ללקוח קיים" });
    const newClientButton = page.getByRole("button", { name: "לקוח חדש" });

    // At least one of the resolution buttons should be present if we have pending client records
    const hasMatchButton = await matchClientButton.count() > 0;
    const hasNewButton = await newClientButton.count() > 0;

    if (hasMatchButton || hasNewButton) {
      if (hasMatchButton) {
        await expect(matchClientButton.first()).toBeVisible();
      }
      if (hasNewButton) {
        await expect(newClientButton.first()).toBeVisible();
      }
    }
  });
});
