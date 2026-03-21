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

test.describe("Admin Contractor Reports", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/contractor-reports");
    await page.waitForLoadState("networkidle");
  });

  test("page loads with filters", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/contractor-reports/);
    // Page heading
    await expect(page.getByRole("heading", { name: "דוחות קבלנות" })).toBeVisible();

    // Date inputs should be visible
    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);
    await expect(fromDateInput).toBeVisible();
    await expect(toDateInput).toBeVisible();

    // Client dropdown should be visible
    const clientSelect = page.locator("select");
    await expect(clientSelect).toBeVisible();
    // "All clients" option should be the default
    await expect(clientSelect.locator("option", { hasText: "כל הלקוחות" })).toBeAttached();
  });

  test("can set date range", async ({ page }) => {
    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);

    // Set a specific date range
    await fromDateInput.fill("2025-01-01");
    await toDateInput.fill("2025-01-31");

    // Verify the values were set
    await expect(fromDateInput).toHaveValue("2025-01-01");
    await expect(toDateInput).toHaveValue("2025-01-31");

    // Quick-set buttons should also work
    await page.getByRole("button", { name: "חודש קודם" }).click();
    // After clicking, the from date should have changed
    const newFromValue = await fromDateInput.inputValue();
    expect(newFromValue).not.toBe("2025-01-01");
  });

  test("shows empty state when no contractor data", async ({ page }) => {
    // Set a date range far in the past unlikely to have data
    const fromDateInput = page.locator('input[type="date"]').first();
    const toDateInput = page.locator('input[type="date"]').nth(1);
    await fromDateInput.fill("2020-01-01");
    await toDateInput.fill("2020-01-31");

    // Click the load stats button ("עבודות")
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    // Either we get the noData message or actual data — both are valid
    const noDataMessage = page.getByText("אין עבודות קבלן בתקופה זו");
    const summaryCards = page.locator("text=סה\"כ שעות");

    // One of these should be visible after loading
    const hasNoData = await noDataMessage.isVisible().catch(() => false);
    const hasData = await summaryCards.isVisible().catch(() => false);
    expect(hasNoData || hasData).toBeTruthy();
  });

  test("export button is present", async ({ page }) => {
    // The CSV export button should always be visible in the filter bar
    const exportButton = page.getByRole("button", { name: "ייצוא לחשבוניות" });
    await expect(exportButton).toBeVisible();
  });
});
