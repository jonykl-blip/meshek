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

test.describe("A. Login & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
  });

  // Desktop sidebar = the aside with class "relative" (mobile one has "fixed")
  function desktopSidebar(page: Page) {
    return page.locator("aside.sidebar-noise.relative");
  }

  // QA Check #1: Admin page shows sidebar
  test("#1 — admin page shows sidebar", async ({ page }) => {
    await expect(desktopSidebar(page)).toBeVisible();
  });

  // QA Check #2: Sidebar shows correct sections with correct item counts
  test("#2 — sidebar sections: דוחות ותפעול (4), ניהול (3), כספים (1)", async ({ page }) => {
    const sidebar = desktopSidebar(page);

    // Section headers
    await expect(sidebar.locator('[id="nav-section-reportsOps"]')).toHaveText("דוחות ותפעול");
    await expect(sidebar.locator('[id="nav-section-management"]')).toHaveText("ניהול");
    await expect(sidebar.locator('[id="nav-section-finance"]')).toHaveText("כספים");

    // Count items per section
    const reportsGroup = sidebar.locator('[role="group"][aria-labelledby="nav-section-reportsOps"]');
    await expect(reportsGroup.locator("a")).toHaveCount(4);

    const managementGroup = sidebar.locator('[role="group"][aria-labelledby="nav-section-management"]');
    await expect(managementGroup.locator("a")).toHaveCount(3);

    const financeGroup = sidebar.locator('[role="group"][aria-labelledby="nav-section-finance"]');
    await expect(financeGroup.locator("a")).toHaveCount(1);
  });

  // QA Check #3: "לקוחות ושטחים" links to /admin/clients-areas
  test("#3 — sidebar לקוחות ושטחים → /admin/clients-areas", async ({ page }) => {
    const sidebar = desktopSidebar(page);
    await sidebar.getByText("לקוחות ושטחים").click();
    await expect(page).toHaveURL(/\/admin\/clients-areas/);
  });

  // QA Check #4: "הגדרות" links to /admin/settings
  test("#4 — sidebar הגדרות → /admin/settings", async ({ page }) => {
    const sidebar = desktopSidebar(page);
    await sidebar.getByText("הגדרות").click();
    await expect(page).toHaveURL(/\/admin\/settings/);
  });

  // QA Check #5: Old sidebar items gone
  test("#5 — old sidebar items removed (no separate שטחים, ציוד, גידולים, לקוחות, סוגי עבודה, חומרים)", async ({ page }) => {
    const sidebar = desktopSidebar(page);

    const sidebarLinks = sidebar.locator("a");
    const allLinkTexts: string[] = [];
    const count = await sidebarLinks.count();
    for (let i = 0; i < count; i++) {
      const text = await sidebarLinks.nth(i).textContent();
      if (text) allLinkTexts.push(text.trim());
    }

    const forbiddenStandaloneItems = ["שטחים", "ציוד", "גידולים", "סוגי עבודה", "חומרים"];
    for (const item of forbiddenStandaloneItems) {
      const exactMatch = allLinkTexts.some((t) => t === item);
      expect(exactMatch, `"${item}" should not appear as a standalone sidebar item`).toBeFalsy();
    }

    const standaloneClients = allLinkTexts.some((t) => t === "לקוחות");
    expect(standaloneClients, `"לקוחות" should not appear standalone`).toBeFalsy();
  });

  // QA Check #6: "דוחות קבלן" appears under דוחות ותפעול
  test("#6 — דוחות קבלן is inside דוחות ותפעול section", async ({ page }) => {
    const sidebar = desktopSidebar(page);
    const reportsGroup = sidebar.locator('[role="group"][aria-labelledby="nav-section-reportsOps"]');
    await expect(reportsGroup.getByText("דוחות קבלן")).toBeVisible();
  });

  // QA Check #7: Breadcrumb shows correct label on each page
  test("#7 — topbar breadcrumb shows correct label per page", async ({ page }) => {
    test.setTimeout(90_000); // 5 page navigations need more time

    const routeLabels: [string, string][] = [
      ["/admin/clients-areas", "לקוחות ושטחים"],
      ["/admin/settings", "הגדרות"],
      ["/admin/workers", "עובדים"],
      ["/admin/contractor-reports", "דוחות קבלנות"],
      ["/admin/review", "רשומות ממתינות לאישור"],
    ];

    // Scope to the topbar (banner role) to avoid matching mobile sidebar text
    const topbar = page.locator("header, [role='banner']").first();

    for (const [route, expectedLabel] of routeLabels) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(topbar.getByText(expectedLabel)).toBeVisible({ timeout: 10_000 });
    }
  });
});
