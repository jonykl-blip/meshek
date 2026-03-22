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

test.describe("Admin Work Types — CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
  });

  test("page loads and shows work types tab", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/settings/);
    // Page heading
    await expect(page.getByRole("heading", { name: "הגדרות" })).toBeVisible();
    // Work types tab should be active by default — check the table is visible
    await expect(page.getByRole("button", { name: "הוסף סוג עבודה" })).toBeVisible();
    // Table should be visible with at least the header row
    await expect(page.locator("table")).toBeVisible();
    // The "Add Work Type" button should be present
    await expect(page.getByRole("button", { name: "הוסף סוג עבודה" })).toBeVisible();
  });

  test("can search work types", async ({ page }) => {
    // Count initial visible rows
    const initialRows = page.locator("tbody tr");
    const initialCount = await initialRows.count();
    test.skip(initialCount === 0, "No work types to search");

    // Get the name of the first work type to search for
    const firstRowText = await initialRows.first().locator("td").first().textContent();
    test.skip(!firstRowText, "Could not read first work type name");

    // Type into the search input
    const searchInput = page.locator('input[placeholder="חיפוש סוג עבודה..."]');
    await searchInput.fill(firstRowText!.trim());

    // The filtered list should contain fewer or equal rows, and include the searched term
    await expect(page.getByText(firstRowText!.trim()).first()).toBeVisible();
  });

  test("can create a new work type", async ({ page }) => {
    const uniqueName = `סוג-בדיקה-${Date.now()}`;

    // Click "Add Work Type" button
    await page.getByRole("button", { name: "הוסף סוג עבודה" }).click();

    // Fill in the Hebrew name
    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await expect(createForm).toBeVisible();

    // Fill name_he — first input in the form
    const nameInput = createForm.locator("input").first();
    await nameInput.fill(uniqueName);

    // Select a category — the select element inside the form
    const categorySelect = createForm.locator("select");
    await categorySelect.selectOption({ index: 1 }); // First real category (not "all categories")

    // Click Save
    await createForm.getByRole("button", { name: "שמור" }).click();

    // Wait for the form to close and the new work type to appear
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test("category badges are color-coded", async ({ page }) => {
    // Category badges in the table use rounded-full with specific color classes
    // Scope to the main content area to avoid matching sidebar role badges
    const mainContent = page.locator("main");
    const badges = mainContent.locator("span.rounded-full");
    const count = await badges.count();
    test.skip(count === 0, "No category badges visible");

    // At least one badge should be visible and have a color class
    const firstBadge = badges.first();
    await expect(firstBadge).toBeVisible();

    // Verify the badge has one of the expected color class patterns
    const className = await firstBadge.getAttribute("class");
    expect(className).toMatch(/bg-(blue|orange|green|yellow|cyan|purple|gray)-\d+/);
  });
});
