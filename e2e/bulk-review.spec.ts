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

test.describe("Admin Review — Bulk Actions", () => {
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

  test("Select All button is present when pending records exist", async ({ page }) => {
    // If there are pending records the Select All button should be visible
    const pendingCheckboxes = page.locator('[role="checkbox"]');
    const checkboxCount = await pendingCheckboxes.count();

    if (checkboxCount > 0) {
      await expect(page.getByRole("button", { name: "בחר הכל" })).toBeVisible();
    } else {
      // No pending records — Select All not rendered, which is correct
      await expect(page.getByRole("button", { name: "בחר הכל" })).not.toBeVisible();
    }
  });

  test("selecting a record shows the bulk action toolbar", async ({ page }) => {
    const checkboxes = page.locator('[role="checkbox"]');
    const count = await checkboxes.count();
    test.skip(count === 0, "No pending records to select");

    await checkboxes.first().click();

    // Bulk toolbar should appear
    await expect(page.getByText(/נבחרו/)).toBeVisible();
    await expect(page.getByRole("button", { name: /אשר נבחרים/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /דחה נבחרים/ })).toBeVisible();
  });

  test("Select All selects all pending records", async ({ page }) => {
    const checkboxes = page.locator('[role="checkbox"]');
    const count = await checkboxes.count();
    test.skip(count === 0, "No pending records to select");

    await page.getByRole("button", { name: "בחר הכל" }).click();

    // All checkboxes should now be checked
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }

    // Button should switch to "Clear Selection"
    await expect(page.getByRole("button", { name: "בטל בחירה" })).toBeVisible();

    // Selected count label should mention the right count
    const selectedLabel = page.getByText(`${count} נבחרו`);
    await expect(selectedLabel).toBeVisible();
  });

  test("clearing selection hides the bulk action toolbar", async ({ page }) => {
    const checkboxes = page.locator('[role="checkbox"]');
    const count = await checkboxes.count();
    test.skip(count === 0, "No pending records to select");

    // Select all then clear
    await page.getByRole("button", { name: "בחר הכל" }).click();
    await page.getByRole("button", { name: "בטל בחירה" }).click();

    // Toolbar should disappear
    await expect(page.getByText(/נבחרו/)).not.toBeVisible();
    // Select All button is back
    await expect(page.getByRole("button", { name: "בחר הכל" })).toBeVisible();
  });

  test("bulk reject shows confirmation step then can be cancelled", async ({ page }) => {
    const checkboxes = page.locator('[role="checkbox"]');
    const count = await checkboxes.count();
    test.skip(count === 0, "No pending records to select");

    await checkboxes.first().click();

    // Click Reject button
    await page.getByRole("button", { name: /דחה נבחרים/ }).first().click();

    // Confirmation prompt should appear
    await expect(page.getByText(/לדחות.*רשומות/)).toBeVisible();

    // Cancel — no records should be rejected
    const cancelButtons = page.getByRole("button", { name: "ביטול" });
    await cancelButtons.last().click();

    // Confirmation prompt gone
    await expect(page.getByText(/לדחות.*רשומות/)).not.toBeVisible();
    // Selection still intact
    await expect(page.getByText(/נבחרו/)).toBeVisible();
  });

  test("Cancel button in bulk toolbar deselects all", async ({ page }) => {
    const checkboxes = page.locator('[role="checkbox"]');
    const count = await checkboxes.count();
    test.skip(count === 0, "No pending records to select");

    await checkboxes.first().click();
    await expect(page.getByText(/נבחרו/)).toBeVisible();

    // Click the Cancel button in the toolbar (not in confirm step)
    await page.getByRole("button", { name: "ביטול" }).first().click();

    await expect(page.getByText(/נבחרו/)).not.toBeVisible();
  });

  test("Show All / Pending Only toggle works", async ({ page }) => {
    // Start on pending-only view
    const showAllBtn = page.getByRole("button", { name: "הצג הכל" });
    if (await showAllBtn.isVisible()) {
      await showAllBtn.click();
      await expect(page).toHaveURL(/show=all/);
      await expect(page.getByRole("button", { name: "ממתינות בלבד" })).toBeVisible();

      await page.getByRole("button", { name: "ממתינות בלבד" }).click();
      await expect(page).not.toHaveURL(/show=all/);
    }
  });
});
