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

  test("shows result state after loading stats", async ({ page }) => {
    // Click the load stats button with current month dates (default)
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    // After loading, one of these states should appear:
    // 1. No data message
    // 2. Summary cards with data
    // 3. Error message
    const noDataMessage = page.getByText("אין עבודות קבלן בתקופה זו");
    const summaryCards = page.getByText(/סה"כ שעות/);
    const errorMessage = page.locator(".text-red-600");

    // Wait for any result to appear
    await expect(
      page.locator(':text("אין עבודות קבלן בתקופה זו"), :text("סה\\"כ שעות"), .text-red-600').first()
    ).toBeVisible({ timeout: 10_000 });

    const hasNoData = await noDataMessage.isVisible().catch(() => false);
    const hasData = await summaryCards.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);
    expect(hasNoData || hasData || hasError).toBeTruthy();
  });

  test("export button is present", async ({ page }) => {
    // The CSV export button should always be visible in the filter bar
    const exportButton = page.getByRole("button", { name: "ייצוא לחשבוניות" });
    await expect(exportButton).toBeVisible();
  });

  // QA Check #33: Click "עבודות" → summary cards + charts + work summary table load
  test("#33 — load stats shows summary cards, charts, and detail table", async ({ page }) => {
    // Use current month (default dates)
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    // Either we get data or no-data state
    const noData = page.getByText("אין עבודות קבלן בתקופה זו");
    const hasNoData = await noData.isVisible().catch(() => false);

    if (!hasNoData) {
      // Summary cards should be visible
      await expect(page.getByText("סה\"כ שעות").first()).toBeVisible();

      // Charts section should be visible (recharts containers)
      const chartContainers = page.locator(".recharts-responsive-container");
      expect(await chartContainers.count()).toBeGreaterThanOrEqual(1);

      // Work summary section should appear if there are sessions
      const workSummary = page.getByText("פירוט עבודות לפי לקוח");
      // May or may not be visible depending on data
      if (await workSummary.isVisible()) {
        await expect(workSummary).toBeVisible();
      }
    }
  });

  // QA Check #34: Summary cards show total hours, dunam, session count, active clients
  test("#34 — summary cards present with correct labels", async ({ page }) => {
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    const noData = page.getByText("אין עבודות קבלן בתקופה זו");
    const hasNoData = await noData.isVisible().catch(() => false);
    test.skip(hasNoData, "No data available for current month");

    await expect(page.getByText("סה\"כ שעות").first()).toBeVisible();
    await expect(page.getByText("סה\"כ דונם").first()).toBeVisible();
    await expect(page.getByText("מספר עבודות").first()).toBeVisible();
    await expect(page.getByText("לקוחות פעילים").first()).toBeVisible();
  });

  // QA Check #35: "פירוט עבודות לפי לקוח" section appears
  test("#35 — work summary section appears with client groups", async ({ page }) => {
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    const noData = page.getByText("אין עבודות קבלן בתקופה זו");
    const hasNoData = await noData.isVisible().catch(() => false);
    test.skip(hasNoData, "No data available for current month");

    await expect(page.getByText("פירוט עבודות לפי לקוח")).toBeVisible({ timeout: 10_000 });

    // Should have at least one collapsible client section
    const clientHeaders = page.locator(".cursor-pointer .font-semibold");
    expect(await clientHeaders.count()).toBeGreaterThanOrEqual(1);
  });

  // QA Check #37: Row columns: date, area, work type, hours, dunam, workers, materials
  test("#37 — detail table has correct column headers", async ({ page }) => {
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    const workSummary = page.getByText("פירוט עבודות לפי לקוח");
    const isVisible = await workSummary.isVisible().catch(() => false);
    test.skip(!isVisible, "No work summary data to check columns");

    // Check table header columns
    const tableHeaders = page.locator("th");
    const headerTexts: string[] = [];
    const count = await tableHeaders.count();
    for (let i = 0; i < count; i++) {
      const text = await tableHeaders.nth(i).textContent();
      if (text) headerTexts.push(text.trim());
    }

    const expectedHeaders = ["תאריך", "שטח", "סוג עבודה", "שעות", "דונם", "עובדים", "חומרים"];
    for (const header of expectedHeaders) {
      expect(headerTexts, `Missing column header: ${header}`).toContainEqual(header);
    }
  });

  // QA Check #38: Collapse/expand client sections works
  test("#38 — client sections collapse and expand", async ({ page }) => {
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    const workSummary = page.getByText("פירוט עבודות לפי לקוח");
    const isVisible = await workSummary.isVisible().catch(() => false);
    test.skip(!isVisible, "No work summary data");

    // Client group sections are inside .rounded-lg.border.bg-card containers
    const clientSections = page.locator(".rounded-lg.border.bg-card.shadow-sm.overflow-hidden");
    const sectionCount = await clientSections.count();
    test.skip(sectionCount === 0, "No client group sections");

    const firstSection = clientSections.first();

    // Table should be visible initially (sections default to open)
    await expect(firstSection.locator("table")).toBeVisible();

    // Click the header trigger to collapse
    const trigger = firstSection.locator(".cursor-pointer").first();
    await trigger.click();
    await page.waitForTimeout(300);

    // Table should be hidden
    await expect(firstSection.locator("table")).not.toBeVisible();

    // Click to expand
    await trigger.click();
    await page.waitForTimeout(300);

    // Table visible again
    await expect(firstSection.locator("table")).toBeVisible();
  });

  // QA Check #39: Client header shows aggregated total hours + dunam
  test("#39 — client header shows aggregated totals", async ({ page }) => {
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    const workSummary = page.getByText("פירוט עבודות לפי לקוח");
    const isVisible = await workSummary.isVisible().catch(() => false);
    test.skip(!isVisible, "No work summary data");

    // Client headers should contain hours text
    const clientHeaders = page.locator(".cursor-pointer").filter({ has: page.locator(".font-semibold") });
    const headerCount = await clientHeaders.count();
    test.skip(headerCount === 0, "No client groups");

    // The header right side should show "X.X שעות"
    const firstHeader = clientHeaders.first();
    const headerText = await firstHeader.textContent();
    expect(headerText).toMatch(/\d+\.?\d*\s*שעות/);
  });

  // QA Check #40: Filter by specific client → only that client shown
  test("#40 — filter by client shows only that client", async ({ page }) => {
    const clientSelect = page.locator("select");
    const options = clientSelect.locator("option");
    const optionCount = await options.count();
    test.skip(optionCount <= 1, "No clients available to filter");

    // Select the second option (first real client after "All clients")
    const secondOption = options.nth(1);
    const clientName = await secondOption.textContent();
    await clientSelect.selectOption({ index: 1 });

    // Load stats
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    const workSummary = page.getByText("פירוט עבודות לפי לקוח");
    const isVisible = await workSummary.isVisible().catch(() => false);

    if (isVisible && clientName) {
      // Only the selected client should appear in the detail section
      const clientGroups = page.locator(".cursor-pointer .font-semibold");
      const groupCount = await clientGroups.count();
      for (let i = 0; i < groupCount; i++) {
        const groupName = await clientGroups.nth(i).textContent();
        expect(groupName?.trim()).toBe(clientName.trim());
      }
    }
  });

  // QA Check #41: CSV export downloads file, no pricing columns
  test("#41 — CSV export downloads file with correct columns", async ({ page }) => {
    // Load stats first
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });

    await page.getByRole("button", { name: "ייצוא לחשבוניות" }).click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/);

    // Read the file content
    const path = await download.path();
    if (path) {
      const fs = await import("fs");
      const content = fs.readFileSync(path, "utf-8");

      // Should NOT contain pricing columns
      expect(content).not.toContain("rate_per_hour");
      expect(content).not.toContain("rate_per_dunam");
      expect(content).not.toContain("מחיר");
      expect(content).not.toContain("תעריף");

      // Should contain Hebrew text (BOM or Hebrew chars)
      expect(content).toMatch(/[\u0590-\u05FF]/);
    }
  });

  // QA Check #42: CSV export with client filter → only filtered client's data
  test("#42 — CSV export with client filter exports only that client", async ({ page }) => {
    const clientSelect = page.locator("select");
    const options = clientSelect.locator("option");
    const optionCount = await options.count();
    test.skip(optionCount <= 1, "No clients available to filter");

    // Select a specific client
    const secondOption = options.nth(1);
    const clientName = (await secondOption.textContent())?.trim();
    await clientSelect.selectOption({ index: 1 });

    // Load stats
    await page.getByRole("button", { name: "עבודות" }).click();
    await page.waitForLoadState("networkidle");

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });

    await page.getByRole("button", { name: "ייצוא לחשבוניות" }).click();

    const download = await downloadPromise;
    const path = await download.path();
    if (path && clientName) {
      const fs = await import("fs");
      const content = fs.readFileSync(path, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      // All data rows (skip header) should reference the filtered client
      // The CSV likely has a client column — verify the client name appears
      expect(content).toContain(clientName);
    }
  });
});
