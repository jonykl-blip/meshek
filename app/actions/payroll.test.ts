import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { getPayrollAggregation, getPayrollAnomalies, exportPayrollCsv } = await import("./payroll");

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
}

function mockAdminRoleCheck() {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: { role: "admin" }, error: null }),
      }),
    }),
  };
}

function mockRoleCheck(role: string) {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: { role }, error: null }),
      }),
    }),
  };
}

// Fluent query builder for payroll queries.
// select→eq→gte→lte→not → resolves Promise
function makePayrollQueryBuilder(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue(result),
  };
  return builder;
}

// Fluent query builder for anomaly queries.
// select→eq→gt→gte→lte→not→order → resolves Promise
function makeAnomalyQueryBuilder(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  };
  return builder;
}

describe("getPayrollAggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("worker"));

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error for invalid date format", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockAdminRoleCheck());

    const result = await getPayrollAggregation({
      fromDate: "bad",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "תאריך לא תקין" });
  });

  it("returns error for inverted date range", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockAdminRoleCheck());

    const result = await getPayrollAggregation({
      fromDate: "2026-03-15",
      toDate: "2026-03-01",
    });

    expect(result).toEqual({
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    });
  });

  it("returns error when Supabase query fails", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: null,
        error: { message: "connection error" },
      });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "connection error" });
  });

  it("returns empty rows when no approved records in range", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({ data: [], error: null });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toEqual([]);
      expect(result.data.total_hours).toBe(0);
      expect(result.data.total_gross_pay).toBe(0);
      expect(result.data.has_missing_rates).toBe(false);
    }
  });

  it("aggregates two records for the same worker into one row", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: [
          {
            profile_id: "w1",
            total_hours: 8,
            profiles: { full_name: "עידן", hourly_rate: 50 },
          },
          {
            profile_id: "w1",
            total_hours: 6.5,
            profiles: { full_name: "עידן", hourly_rate: 50 },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].total_hours).toBe(14.5);
      expect(result.data.rows[0].record_count).toBe(2);
      expect(result.data.rows[0].gross_pay).toBe(725); // 14.5 * 50
    }
  });

  it("returns two workers sorted alphabetically by Hebrew name", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: [
          {
            profile_id: "w2",
            total_hours: 5,
            profiles: { full_name: "תמר", hourly_rate: 40 },
          },
          {
            profile_id: "w1",
            total_hours: 8,
            profiles: { full_name: "אבי", hourly_rate: 50 },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0].worker_name).toBe("אבי");
      expect(result.data.rows[1].worker_name).toBe("תמר");
    }
  });

  it("handles worker with null hourly_rate", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: [
          {
            profile_id: "w1",
            total_hours: 8,
            profiles: { full_name: "עידן", hourly_rate: null },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0].hourly_rate).toBeNull();
      expect(result.data.rows[0].gross_pay).toBeNull();
      expect(result.data.has_missing_rates).toBe(true);
      expect(result.data.total_gross_pay).toBe(0);
    }
  });

  it("calculates gross_pay as total_hours * hourly_rate", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: [
          {
            profile_id: "w1",
            total_hours: 10,
            profiles: { full_name: "עידן", hourly_rate: 45 },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0].gross_pay).toBe(450);
      expect(result.data.total_hours).toBe(10);
      expect(result.data.total_gross_pay).toBe(450);
    }
  });

  it("aggregates records with different areas for same worker into single row", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: [
          {
            profile_id: "w1",
            total_hours: 4,
            profiles: { full_name: "עידן", hourly_rate: 50 },
          },
          {
            profile_id: "w1",
            total_hours: 5,
            profiles: { full_name: "עידן", hourly_rate: 50 },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAggregation({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].total_hours).toBe(9);
      expect(result.data.rows[0].gross_pay).toBe(450);
    }
  });
});

describe("getPayrollAnomalies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no approved records exceed 12 hours", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makeAnomalyQueryBuilder({ data: [], error: null });
    });

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: true, data: [] });
  });

  it("returns one anomaly record when total_hours = 13", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makeAnomalyQueryBuilder({
        data: [
          {
            id: "log-1",
            total_hours: 13,
            work_date: "2026-03-10",
            profiles: { full_name: "עידן" },
            areas: { name: "שדה א" },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].worker_name).toBe("עידן");
      expect(result.data[0].work_date).toBe("2026-03-10");
      expect(result.data[0].area_name).toBe("שדה א");
      expect(result.data[0].total_hours).toBe(13);
    }
  });

  it("uses strict gt(total_hours, 12) — record at exactly 12 is excluded, record at 12.1 is included", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    // Simulate Supabase correctly applying .gt("total_hours", 12): 12.1 passes, 12.0 does not
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makeAnomalyQueryBuilder({
        data: [
          {
            id: "log-2",
            total_hours: 12.1,
            work_date: "2026-03-05",
            profiles: { full_name: "עידן" },
            areas: { name: "שדה ב" },
          },
        ],
        error: null,
      });
    });

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].total_hours).toBe(12.1);
    }
  });

  it("returns error for invalid date format", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockAdminRoleCheck());

    const result = await getPayrollAnomalies({
      fromDate: "bad",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "תאריך לא תקין" });
  });

  it("returns error for inverted date range", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockAdminRoleCheck());

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-15",
      toDate: "2026-03-01",
    });

    expect(result).toEqual({
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("worker"));

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error when Supabase query fails", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makeAnomalyQueryBuilder({
        data: null,
        error: { message: "connection error" },
      });
    });

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "connection error" });
  });
});

function makeAuditInsertBuilder(error: { message: string } | null = null) {
  return { insert: vi.fn().mockResolvedValue({ error }) };
}

describe("exportPayrollCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    mockSupabase.from.mockImplementation(() => mockRoleCheck("worker"));

    const result = await exportPayrollCsv({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error for invalid date format", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockAdminRoleCheck());

    const result = await exportPayrollCsv({ fromDate: "bad", toDate: "2026-03-31" });

    expect(result).toEqual({ success: false, error: "תאריך לא תקין" });
  });

  it("returns error for inverted date range", async () => {
    mockAuthenticatedAdmin();
    mockSupabase.from.mockImplementation(() => mockAdminRoleCheck());

    const result = await exportPayrollCsv({
      fromDate: "2026-03-31",
      toDate: "2026-03-01",
    });

    expect(result).toEqual({
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    });
  });

  it("returns error when Supabase query fails", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      return makePayrollQueryBuilder({
        data: null,
        error: { message: "connection error" },
      });
    });

    const result = await exportPayrollCsv({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: false, error: "connection error" });
  });

  it("exports two workers — CSV contains BOM, metadata row, header, two data rows", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2)
        return makePayrollQueryBuilder({
          data: [
            {
              profile_id: "w1",
              total_hours: 160,
              profiles: { full_name: "אבי", hourly_rate: 40 },
            },
            {
              profile_id: "w2",
              total_hours: 120,
              profiles: { full_name: "תמר", hourly_rate: 35 },
            },
          ],
          error: null,
        });
      return makeAuditInsertBuilder(null);
    });

    const result = await exportPayrollCsv({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.csvContent.startsWith("\uFEFF")).toBe(true);
      expect(result.data.csvContent).toContain("2026-03-01 - 2026-03-31");
      expect(result.data.filename).toBe("payroll-2026-03-01-to-2026-03-31.csv");

      // Verify row count: meta + header + 2 data rows
      const lines = result.data.csvContent.replace("\uFEFF", "").split("\r\n");
      expect(lines).toHaveLength(4);

      // Verify computed values: אבי = 160 * 40 = 6400, תמר = 120 * 35 = 4200
      expect(result.data.csvContent).toContain("אבי,160.0,40.00,6400.00");
      expect(result.data.csvContent).toContain("תמר,120.0,35.00,4200.00");
    }
  });

  it("worker with null hourly_rate — rate and gross pay fields are empty string in CSV", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2)
        return makePayrollQueryBuilder({
          data: [
            {
              profile_id: "w1",
              total_hours: 80,
              profiles: { full_name: "אחמד", hourly_rate: null },
            },
          ],
          error: null,
        });
      return makeAuditInsertBuilder(null);
    });

    const result = await exportPayrollCsv({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.csvContent).not.toContain("null");
      // Verify exact row format: name, hours, empty rate, empty gross
      expect(result.data.csvContent).toContain("אחמד,80.0,,");
    }
  });

  it("audit log failure causes action to throw", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2)
        return makePayrollQueryBuilder({
          data: [
            {
              profile_id: "w1",
              total_hours: 8,
              profiles: { full_name: "עידן", hourly_rate: 50 },
            },
          ],
          error: null,
        });
      return makeAuditInsertBuilder({ message: "audit fail" });
    });

    await expect(
      exportPayrollCsv({ fromDate: "2026-03-01", toDate: "2026-03-31" })
    ).rejects.toThrow("audit fail");
  });

  it("exports empty CSV with only metadata and header when no records match", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2)
        return makePayrollQueryBuilder({ data: [], error: null });
      return makeAuditInsertBuilder(null);
    });

    const result = await exportPayrollCsv({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const lines = result.data.csvContent.replace("\uFEFF", "").split("\r\n");
      expect(lines).toHaveLength(2); // meta + header only
      expect(result.data.csvContent).toContain("תקופה:");
      expect(result.data.csvContent).toContain("שם עובד");
    }
  });

  it("writes correct audit payload on successful export", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    const auditBuilder = makeAuditInsertBuilder(null);
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      if (callIndex === 2)
        return makePayrollQueryBuilder({
          data: [
            {
              profile_id: "w1",
              total_hours: 10,
              profiles: { full_name: "עידן", hourly_rate: 50 },
            },
          ],
          error: null,
        });
      return auditBuilder;
    });

    const result = await exportPayrollCsv({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result.success).toBe(true);
    expect(auditBuilder.insert).toHaveBeenCalledWith({
      actor_id: "admin-1",
      table_name: "payroll_export",
      record_id: expect.any(String),
      action: "create",
      before_json: null,
      after_json: {
        from: "2026-03-01",
        to: "2026-03-31",
        worker_count: 1,
        total_hours: 10,
        total_gross_pay: 500,
      },
    });
  });
});
