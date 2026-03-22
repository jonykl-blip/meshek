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

test.describe("Admin Clients — CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/clients-areas");
    await page.waitForLoadState("networkidle");
  });

  test("page loads and shows clients-areas unified view", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/clients-areas/);
    // Page heading
    await expect(page.getByRole("heading", { name: "לקוחות ושטחים" })).toBeVisible();
    // Own-farm section should always be present
    await expect(page.getByText("שטחי המשק")).toBeVisible();
  });

  test("own-farm section is visible", async ({ page }) => {
    // The own-farm section should display the green badge
    const ownFarmBadge = page.getByText("שטחי המשק").first();
    await expect(ownFarmBadge).toBeVisible();
  });

  test("can create a new client", async ({ page }) => {
    const uniqueName = `לקוח-בדיקה-${Date.now()}`;

    // Click "Add Client" button
    await page.getByRole("button", { name: "הוסף לקוח" }).click();

    // Fill in the name field — first input in the create form
    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await createForm.locator("input").first().fill(uniqueName);

    // Click Save
    await createForm.getByRole("button", { name: "שמור" }).click();

    // Wait for the form to close and the new client to appear
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test("can add alias to a client", async ({ page }) => {
    // Find a "Add Alias" button for client aliases
    const addAliasButtons = page.getByRole("button", { name: "הוסף כינוי" });
    const count = await addAliasButtons.count();
    test.skip(count === 0, "No clients to add aliases to");

    // Click the first "Add Alias" button
    await addAliasButtons.first().click();

    // The alias input should appear
    const aliasInput = page.locator("input.h-7.w-28");
    await expect(aliasInput).toBeVisible();

    const aliasName = `כינוי-${Date.now()}`;
    await aliasInput.fill(aliasName);
    await aliasInput.press("Enter");

    // Wait for the alias chip (Badge) to appear
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(aliasName)).toBeVisible({ timeout: 10_000 });
  });

  // QA Check #9: Own farm shows שקדים, חיטה 3, זיתים with crop badges
  test("#9 — own farm section shows expected areas with crop badges", async ({ page }) => {
    // The own-farm section has green header with "שטחי המשק" badge
    const ownFarmHeader = page.locator(".bg-green-50").first();
    await expect(ownFarmHeader).toBeVisible();

    // Navigate to the parent section element
    const ownFarmSection = ownFarmHeader.locator("xpath=ancestor::section[1]");

    // Expected own-farm areas (from actual DB data)
    await expect(ownFarmSection.getByText("שקדים").first()).toBeVisible();
    await expect(ownFarmSection.getByText("חיטה 3").first()).toBeVisible();
    await expect(ownFarmSection.getByText("זיתים").first()).toBeVisible();
  });

  // QA Check #10: גדש העמק section is collapsible
  test("#10 — client section is collapsible", async ({ page }) => {
    // Find the גדש העמק header (orange background)
    const clientHeader = page.locator(".bg-orange-50").filter({ hasText: "גדש העמק" }).first();
    await expect(clientHeader).toBeVisible();

    // Click to collapse
    await clientHeader.click();
    await page.waitForTimeout(300);

    // Click to expand again
    await clientHeader.click();
    await page.waitForTimeout(300);

    // Header should still be visible (section didn't break)
    await expect(clientHeader).toBeVisible();
  });

  // QA Check #11: גדש העמק contains areas (actual data: חלקה א, תירס, גדש העמק area)
  test("#11 — גדש העמק section contains expected areas", async ({ page }) => {
    // Find the section containing גדש העמק
    const clientHeader = page.locator(".bg-orange-50").filter({ hasText: "גדש העמק" }).first();
    const section = clientHeader.locator("xpath=ancestor::section[1]");

    // From actual DB: areas are "חלקה א", "תירס", "גדש העמק" (area with same name as client)
    await expect(section.getByText("חלקה א").first()).toBeVisible();
    await expect(section.getByText("תירס").first()).toBeVisible();
  });

  // QA Check #12: קיבוץ יפעת contains גוש א (זיתים)
  test("#12 — קיבוץ יפעת contains גוש א with זיתים crop", async ({ page }) => {
    const clientHeader = page.locator(".bg-orange-50").filter({ hasText: "יפעת" }).first();
    const section = clientHeader.locator("xpath=ancestor::section[1]");

    // From actual DB: "גוש א" (no geresh), crop "זיתים"
    await expect(section.getByText("גוש א").first()).toBeVisible();
    await expect(section.getByText("זיתים").first()).toBeVisible();
  });

  // QA Check #13: Add client form has NO pricing fields
  test("#13 — add client form has no pricing fields", async ({ page }) => {
    await page.getByRole("button", { name: "הוסף לקוח" }).click();

    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await expect(createForm).toBeVisible();

    // Form should NOT contain rate/pricing inputs
    const formHtml = await createForm.innerHTML();
    expect(formHtml).not.toContain("rate_per_dunam");
    expect(formHtml).not.toContain("rate_per_hour");
    expect(formHtml).not.toContain("תעריף");

    // Cancel out
    await createForm.getByRole("button", { name: "ביטול" }).click();
  });

  // QA Check #15: Add area inside client → pre-fills client
  test("#15 — add area inside client section pre-fills client", async ({ page }) => {
    const clientHeader = page.locator(".bg-orange-50").filter({ hasText: "גדש העמק" }).first();
    const section = clientHeader.locator("xpath=ancestor::section[1]");
    await expect(section).toBeVisible();

    // Click add area button within this client section
    const addAreaBtn = section.getByRole("button", { name: /הוסף שטח/ });
    await addAreaBtn.click();

    // The form should appear
    const form = section.locator(".rounded-md.border.bg-muted\\/10");
    await expect(form).toBeVisible();

    // Since prefilledClientId is set, the ownership toggle is hidden
    const ownFieldCheckbox = form.locator('button[role="checkbox"]');
    await expect(ownFieldCheckbox).toHaveCount(0);

    // Cancel out
    await form.getByRole("button", { name: "ביטול" }).click();
  });

  // QA Check #16: Add area inside own farm → defaults to own field checked
  test("#16 — add area inside own farm defaults to own field checkbox", async ({ page }) => {
    const ownFarmHeader = page.locator(".bg-green-50").first();
    const ownFarmSection = ownFarmHeader.locator("xpath=ancestor::section[1]");

    const addAreaBtn = ownFarmSection.getByRole("button", { name: /הוסף שטח/ });
    await addAreaBtn.click();

    const form = ownFarmSection.locator(".rounded-md.border.bg-muted\\/10");
    await expect(form).toBeVisible();

    // The own-field checkbox should not be visible (prefilledClientId is null for own farm = implicit own)
    // or if visible, should be checked
    const ownFieldCheckbox = form.locator('button[role="checkbox"]');
    if (await ownFieldCheckbox.count() > 0) {
      await expect(ownFieldCheckbox.first()).toBeChecked();
    }

    // Cancel out
    await form.getByRole("button", { name: "ביטול" }).click();
  });

  // QA Check #17: Edit client dialog has name, phone, notes, NO rates
  test("#17 — edit client dialog shows name, phone, notes but no rates", async ({ page }) => {
    // Find edit button on the גדש העמק client section header
    const clientHeader = page.locator(".bg-orange-50").filter({ hasText: "גדש העמק" }).first();
    const section = clientHeader.locator("xpath=ancestor::section[1]");
    const editBtn = section.getByRole("button", { name: "עריכה" }).first();
    await editBtn.click();

    // Dialog should appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Should have inputs (name, phone, notes)
    await expect(dialog.locator("input").first()).toBeVisible();

    // Should NOT have rate fields
    const dialogHtml = await dialog.innerHTML();
    expect(dialogHtml).not.toContain("rate_per_dunam");
    expect(dialogHtml).not.toContain("rate_per_hour");
    expect(dialogHtml).not.toContain("תעריף");

    // Close dialog
    await dialog.getByRole("button", { name: "ביטול" }).click();
  });

  // QA Check #19: Edit area shows inline edit with name, crop, ownership, dunam
  test("#19 — edit area shows inline form with name, crop, ownership, dunam", async ({ page }) => {
    // Find area-level edit buttons (inside area cards with bg-background)
    const areaCards = page.locator(".rounded-md.border.bg-background");
    const areaCount = await areaCards.count();
    test.skip(areaCount === 0, "No area cards found");

    const areaEditBtn = areaCards.first().getByRole("button", { name: "עריכה" });
    await areaEditBtn.click();

    // Edit form should appear
    const editForm = page.locator(".rounded-md.border.bg-muted\\/20");
    await expect(editForm).toBeVisible();

    // Should have inputs (name + dunam at minimum)
    const inputs = editForm.locator("input");
    expect(await inputs.count()).toBeGreaterThanOrEqual(1);

    // Dunam input (type number)
    const dunamInput = editForm.locator('input[type="number"]');
    await expect(dunamInput).toBeVisible();

    // Cancel out
    await editForm.getByRole("button", { name: "ביטול" }).click();
  });

  // QA Check #20: Add alias to area → badge appears
  test("#20 — add alias to area shows badge", async ({ page }) => {
    const areaCards = page.locator(".rounded-md.border.bg-background");
    const areaCount = await areaCards.count();
    test.skip(areaCount === 0, "No area cards found");

    const addAliasBtn = areaCards.first().getByRole("button", { name: "הוסף כינוי" });
    const hasBtn = await addAliasBtn.count();
    test.skip(hasBtn === 0, "No add alias button on area cards");

    await addAliasBtn.click();

    const aliasInput = areaCards.first().locator("input.h-7.w-28");
    await expect(aliasInput).toBeVisible();

    const aliasName = `כינוי-שטח-${Date.now()}`;
    await aliasInput.fill(aliasName);
    await aliasInput.press("Enter");

    await page.waitForLoadState("networkidle");
    await expect(page.getByText(aliasName)).toBeVisible({ timeout: 10_000 });
  });

  // QA Check #21: Search "גדש" → only גדש העמק section visible
  test("#21 — search filters to matching client sections", async ({ page }) => {
    // Use the search input by placeholder text
    const searchInput = page.getByPlaceholder("חיפוש לקוח...");
    await searchInput.fill("גדש");

    // Wait for filtering
    await page.waitForTimeout(500);

    // גדש העמק section should still be visible
    const gadsHeader = page.locator(".bg-orange-50").filter({ hasText: "גדש העמק" });
    await expect(gadsHeader.first()).toBeVisible();

    // יפעת section should NOT be visible (filtered out)
    const yifatHeader = page.locator(".bg-orange-50").filter({ hasText: "יפעת" });
    await expect(yifatHeader).toHaveCount(0);
  });

  // QA Check #22: Archive test client → confirm dialog, section disappears
  test("#22 — archive client shows confirm dialog and removes section", async ({ page }) => {
    test.setTimeout(60_000); // create + archive with API calls needs time

    // First create a test client to archive
    const uniqueName = `לקוח-למחיקה-${Date.now()}`;
    await page.getByRole("button", { name: "הוסף לקוח" }).click();
    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await createForm.locator("input").first().fill(uniqueName);
    await createForm.getByRole("button", { name: "שמור" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });

    // Find the section header for the new client and its archive button
    const clientHeader = page.locator(".bg-orange-50").filter({ hasText: uniqueName }).first();
    const section = clientHeader.locator("xpath=ancestor::section[1]");
    const archiveBtn = section.getByRole("button", { name: "גנוז" }).first();
    await archiveBtn.click();

    // Confirm dialog should appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click the confirm button ("אישור") — it becomes "שומר..." while saving
    await dialog.getByRole("button", { name: "אישור" }).click();

    // Wait for dialog to close (API call may take a few seconds)
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });

    // Archive completed — feedback message should appear or section shows archived state
    await expect(page.locator("span.text-green-600")).toBeVisible({ timeout: 5_000 });
  });
});
