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

test.describe("C. Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
  });

  // QA Check #23: Page loads with heading "הגדרות", 4 tabs visible
  test("#23 — page loads with heading and 4 tabs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "הגדרות" })).toBeVisible();

    // 4 tab triggers should be visible
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(4);

    await expect(page.getByRole("tab", { name: "סוגי עבודה" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "חומרים" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "גידולים" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "ציוד" })).toBeVisible();
  });

  // QA Check #24: Default tab is "סוגי עבודה"
  test("#24 — default tab is סוגי עבודה", async ({ page }) => {
    const workTypesTab = page.getByRole("tab", { name: "סוגי עבודה" });
    await expect(workTypesTab).toHaveAttribute("data-state", "active");

    // Work types table should be visible
    await expect(page.locator("table")).toBeVisible();
    // The "Add Work Type" button should be present
    await expect(page.getByRole("button", { name: "הוסף סוג עבודה" })).toBeVisible();
  });

  // QA Check #25: Click "חומרים" tab → materials table loads
  test("#25 — חומרים tab shows materials table", async ({ page }) => {
    await page.getByRole("tab", { name: "חומרים" }).click();

    const materialsTab = page.getByRole("tab", { name: "חומרים" });
    await expect(materialsTab).toHaveAttribute("data-state", "active");

    // Materials table should be visible
    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "הוסף חומר" })).toBeVisible();
  });

  // QA Check #26: Click "גידולים" tab → crops table loads
  test("#26 — גידולים tab shows crops table", async ({ page }) => {
    await page.getByRole("tab", { name: "גידולים" }).click();

    const cropsTab = page.getByRole("tab", { name: "גידולים" });
    await expect(cropsTab).toHaveAttribute("data-state", "active");

    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "הוסף גידול" })).toBeVisible();
  });

  // QA Check #27: Click "ציוד" tab → equipment table loads
  test("#27 — ציוד tab shows equipment table", async ({ page }) => {
    await page.getByRole("tab", { name: "ציוד" }).click();

    const equipmentTab = page.getByRole("tab", { name: "ציוד" });
    await expect(equipmentTab).toHaveAttribute("data-state", "active");

    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "הוסף ציוד" })).toBeVisible();
  });

  // QA Check #28: Create a work type → row appears (already covered, but included for completeness)
  test("#28 — create work type in סוגי עבודה", async ({ page }) => {
    const uniqueName = `סוג-qa-${Date.now()}`;

    await page.getByRole("button", { name: "הוסף סוג עבודה" }).click();

    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await expect(createForm).toBeVisible();

    // Fill name
    await createForm.locator("input").first().fill(uniqueName);

    // Select a category
    const categorySelect = createForm.locator("select");
    await categorySelect.selectOption({ index: 1 });

    // Save
    await createForm.getByRole("button", { name: "שמור" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  // QA Check #29: Create a material in חומרים tab → row appears
  test("#29 — create material in חומרים tab", async ({ page }) => {
    await page.getByRole("tab", { name: "חומרים" }).click();
    await page.waitForLoadState("networkidle");

    const uniqueName = `חומר-qa-${Date.now()}`;

    await page.getByRole("button", { name: "הוסף חומר" }).click();

    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await expect(createForm).toBeVisible();

    // Fill name
    await createForm.locator("input").first().fill(uniqueName);

    // Select a category
    const categorySelect = createForm.locator("select");
    if (await categorySelect.count() > 0) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Save
    await createForm.getByRole("button", { name: "שמור" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  // QA Check #30: Refresh page with ?tab=materials → materials tab active
  test("#30 — URL ?tab=materials activates materials tab on load", async ({ page }) => {
    await page.goto("/admin/settings?tab=materials");
    await page.waitForLoadState("networkidle");

    const materialsTab = page.getByRole("tab", { name: "חומרים" });
    await expect(materialsTab).toHaveAttribute("data-state", "active");

    // Materials-specific content should be visible
    await expect(page.getByRole("button", { name: "הוסף חומר" })).toBeVisible();
  });

  // QA Check #31: Edit + archive operations work, feedback message shown
  test("#31 — edit and archive operations show feedback", async ({ page }) => {
    test.setTimeout(60_000); // create + edit + archive needs more time

    // First create a work type to edit/archive
    const uniqueName = `סוג-archive-${Date.now()}`;
    await page.getByRole("button", { name: "הוסף סוג עבודה" }).click();

    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await createForm.locator("input").first().fill(uniqueName);
    const categorySelect = createForm.locator("select");
    await categorySelect.selectOption({ index: 1 });
    await createForm.getByRole("button", { name: "שמור" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });

    // Feedback message should appear (green text)
    const feedback = page.locator("span.text-green-600");
    await expect(feedback).toBeVisible({ timeout: 5_000 });

    // Find the row with our work type and click edit
    const row = page.locator("tr").filter({ hasText: uniqueName });
    await row.getByRole("button", { name: "עריכה" }).click();

    // After clicking edit, the row expands into a form with inputs.
    // Find the first visible textbox in the table that contains our name.
    const editForm = page.locator("tr").filter({ has: page.getByRole("button", { name: "שמור" }) }).last();
    await expect(editForm).toBeVisible({ timeout: 5_000 });

    const editInput = editForm.locator("input").first();
    const editedName = `${uniqueName}-ed`;
    await editInput.fill(editedName);

    // Click save on the edit form
    await editForm.getByRole("button", { name: "שמור" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(editedName)).toBeVisible({ timeout: 10_000 });

    // Now archive it
    const updatedRow = page.locator("tr").filter({ hasText: editedName });
    await updatedRow.getByRole("button", { name: "גנוז" }).click();

    // Confirm dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: "אישור" }).click();
    await page.waitForLoadState("networkidle");

    // Feedback should appear
    await expect(page.locator("span.text-green-600")).toBeVisible({ timeout: 5_000 });
  });
});
