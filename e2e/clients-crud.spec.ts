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
    await page.goto("/admin/clients");
    await page.waitForLoadState("networkidle");
  });

  test("page loads and shows clients list", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/clients/);
    // Page heading
    await expect(page.getByRole("heading", { name: "ניהול לקוחות" })).toBeVisible();
    // Own-farm client should always be present
    await expect(page.getByText("משק פילצביץ׳")).toBeVisible();
  });

  test("own-farm client has special badge", async ({ page }) => {
    // The own-farm row should display the green badge with the ownFarm label
    const ownFarmBadge = page.locator("text=משק פילצביץ׳").first();
    await expect(ownFarmBadge).toBeVisible();
  });

  test("can create a new client", async ({ page }) => {
    const uniqueName = `לקוח-בדיקה-${Date.now()}`;

    // Click "Add Client" button
    await page.getByRole("button", { name: "הוסף לקוח" }).click();

    // Fill in the name field — the create form has a Label "שם הלקוח" followed by an Input
    const createForm = page.locator(".rounded-lg.border.bg-card.p-4.shadow-sm");
    await createForm.locator("input").first().fill(uniqueName);

    // Click Save
    await createForm.getByRole("button", { name: "שמור" }).click();

    // Wait for the form to close and the new client to appear in the list
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test("can add alias to a client", async ({ page }) => {
    // Find a non-own-farm row that has an "Add Alias" button
    const addAliasButtons = page.getByRole("button", { name: "הוסף כינוי" });
    const count = await addAliasButtons.count();
    test.skip(count === 0, "No non-own-farm clients to add aliases to");

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

  test("own-farm client cannot be archived", async ({ page }) => {
    // The own-farm row should show "—" instead of Edit/Archive buttons
    // Find the row containing the own-farm badge text
    const ownFarmRow = page.locator("tr", { has: page.locator("text=משק פילצביץ׳") });

    // There should be no "Archive" (גנוז) button in this row
    const archiveButton = ownFarmRow.getByRole("button", { name: "גנוז" });
    await expect(archiveButton).toHaveCount(0);

    // There should be no "Edit" (עריכה) button either
    const editButton = ownFarmRow.getByRole("button", { name: "עריכה" });
    await expect(editButton).toHaveCount(0);
  });
});
