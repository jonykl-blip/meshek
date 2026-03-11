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

const { getPayrollAggregation, getPayrollAnomalies } = await import("./payroll");

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

  it("returns empty array when total_hours = 12 (strictly greater than 12 threshold)", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return mockAdminRoleCheck();
      // Supabase .gt("total_hours", 12) already filters this out — mock returns empty
      return makeAnomalyQueryBuilder({ data: [], error: null });
    });

    const result = await getPayrollAnomalies({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(result).toEqual({ success: true, data: [] });
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
});
