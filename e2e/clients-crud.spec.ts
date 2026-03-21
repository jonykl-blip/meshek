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
});
