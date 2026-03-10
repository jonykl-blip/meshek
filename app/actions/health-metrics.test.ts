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

const { getAttendanceHealthMetrics, getStaleListStatus } = await import(
  "./health-metrics"
);

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
}

describe("getAttendanceHealthMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getAttendanceHealthMetrics();

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    // verifyAdminCaller queries profiles for role
    mockSupabase.from.mockImplementation(() => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: () => Promise.resolve({ data: { role: "worker" }, error: null }),
      };
      return builder;
    });

    const result = await getAttendanceHealthMetrics();

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns correct counts and rate with records", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // verifyAdminCaller — profiles role check
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: "admin" }, error: null }),
            }),
          }),
        };
      }
      if (callIndex === 2) {
        // total records count
        return {
          select: () => ({
            gte: () => Promise.resolve({ count: 50, error: null }),
          }),
        };
      }
      if (callIndex === 3) {
        // pending count
        return {
          select: () => ({
            gte: () => ({
              eq: () => Promise.resolve({ count: 10, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    });

    const result = await getAttendanceHealthMetrics();

    expect(result).toEqual({
      success: true,
      data: { totalRecords: 50, pendingCount: 10, unmatchedRate: 20 },
    });
  });

  it("returns zero rate with no records (no division by zero)", async () => {
    mockAuthenticatedAdmin();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: "owner" }, error: null }),
            }),
          }),
        };
      }
      if (callIndex === 2) {
        return {
          select: () => ({
            gte: () => Promise.resolve({ count: 0, error: null }),
          }),
        };
      }
      if (callIndex === 3) {
        return {
          select: () => ({
            gte: () => ({
              eq: () => Promise.resolve({ count: 0, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    });

    const result = await getAttendanceHealthMetrics();

    expect(result).toEqual({
      success: true,
      data: { totalRecords: 0, pendingCount: 0, unmatchedRate: 0 },
    });
  });
});

describe("getStaleListStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getStaleListStatus();

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns isStale false with recent updates", async () => {
    mockAuthenticatedAdmin();
    const recentDate = new Date().toISOString();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: "admin" }, error: null }),
            }),
          }),
        };
      }
      if (callIndex === 2) {
        // profiles latest updated_at
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { updated_at: recentDate }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (callIndex === 3) {
        // areas latest updated_at
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { updated_at: recentDate }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    });

    const result = await getStaleListStatus();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isStale).toBe(false);
      expect(result.data.workersLastUpdated).toBe(recentDate);
      expect(result.data.areasLastUpdated).toBe(recentDate);
    }
  });

  it("returns isStale true with stale data (>30 days)", async () => {
    mockAuthenticatedAdmin();
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    let callIndex = 0;
    mockSupabase.from.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role: "admin" }, error: null }),
            }),
          }),
        };
      }
      if (callIndex === 2) {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { updated_at: staleDate }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (callIndex === 3) {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { updated_at: staleDate }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    });

    const result = await getStaleListStatus();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isStale).toBe(true);
    }
  });
});
