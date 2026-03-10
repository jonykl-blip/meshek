import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

// Must import after mocks are set up
const { bindTelegramId } = await import("./workers");

// Helper to chain Supabase query builder methods
function mockQuery(returnValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const handler = () =>
    new Proxy(chain, {
      get(_, prop) {
        if (prop === "then") return undefined; // not a promise
        if (
          ["select", "eq", "neq", "single", "maybeSingle", "update", "insert"]
            .includes(prop as string)
        ) {
          return (..._args: unknown[]) =>
            new Proxy(chain, {
              get(_, innerProp) {
                if (innerProp === "then") return undefined;
                if (innerProp === "single" || innerProp === "maybeSingle") {
                  return () => Promise.resolve(returnValue);
                }
                if (
                  ["select", "eq", "neq", "update", "insert"].includes(
                    innerProp as string,
                  )
                ) {
                  return handler();
                }
                return Promise.resolve(returnValue);
              },
            });
        }
        return Promise.resolve(returnValue);
      },
    });
  return handler;
}

// Simpler approach: mock .from() per call sequence
function setupMockChain(results: { data: unknown; error: unknown }[]) {
  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex++;
    const builder = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      update: () => builder,
      insert: () => builder,
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
    };
    return builder;
  });
}

describe("bindTelegramId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await bindTelegramId("profile-1", "12345");

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([
      { data: { role: "worker" }, error: null }, // caller profile
    ]);

    const result = await bindTelegramId("profile-1", "12345");

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error for non-numeric telegram ID", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([
      { data: { role: "owner" }, error: null }, // caller profile
    ]);

    const result = await bindTelegramId("profile-1", "abc123");

    expect(result).toEqual({
      success: false,
      error: "מזהה טלגרם חייב להיות מספרי",
    });
  });

  it("returns error when telegram ID is already bound to another worker", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller profile
      { data: { id: "other", full_name: "דני" }, error: null }, // existing binding
    ]);

    const result = await bindTelegramId("profile-1", "99999");

    expect(result).toEqual({
      success: false,
      error: "מזהה טלגרם כבר משויך ל-דני",
    });
  });

  it("successfully binds telegram ID for admin caller", async () => {
    const updatedProfile = {
      id: "profile-1",
      full_name: "אורי",
      role: "worker",
      language_pref: "he",
      telegram_id: "12345",
      is_active: true,
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller profile
      { data: null, error: null }, // no existing binding (maybeSingle)
      { data: { id: "profile-1", full_name: "אורי", telegram_id: null }, error: null }, // before state
      { data: updatedProfile, error: null }, // update result
    ]);

    const result = await bindTelegramId("profile-1", "12345");

    expect(result).toEqual({ success: true, data: updatedProfile });
  });

  it("allows clearing telegram ID with empty string", async () => {
    const updatedProfile = {
      id: "profile-1",
      full_name: "אורי",
      role: "worker",
      language_pref: "he",
      telegram_id: null,
      is_active: true,
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    // When clearing (empty string), uniqueness check is skipped — only 3 .from() calls
    setupMockChain([
      { data: { role: "owner" }, error: null }, // caller profile
      { data: { id: "profile-1", full_name: "אורי", telegram_id: "12345" }, error: null }, // before state
      { data: updatedProfile, error: null }, // update result
    ]);

    const result = await bindTelegramId("profile-1", "");

    expect(result).toEqual({ success: true, data: updatedProfile });
  });
});
