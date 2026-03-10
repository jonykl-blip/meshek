import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

const mockAdminClient = {
  auth: {
    admin: {
      createUser: vi.fn(),
    },
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Must import after mocks are set up
const {
  bindTelegramId,
  createWorkerProfile,
  updateWorkerProfile,
  archiveWorkerProfile,
} = await import("./workers");

// Mock .from() per call sequence for a given client
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

function setupAdminMockChain(results: { data: unknown; error: unknown }[]) {
  let callIndex = 0;
  mockAdminClient.from.mockImplementation(() => {
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

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
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
    ]);
    setupAdminMockChain([
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
    // When clearing (empty string), uniqueness check is skipped — only 2 supabase .from() calls
    setupMockChain([
      { data: { role: "owner" }, error: null }, // caller profile
      { data: { id: "profile-1", full_name: "אורי", telegram_id: "12345" }, error: null }, // before state
    ]);
    setupAdminMockChain([
      { data: updatedProfile, error: null }, // update result
    ]);

    const result = await bindTelegramId("profile-1", "");

    expect(result).toEqual({ success: true, data: updatedProfile });
  });
});

describe("createWorkerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createWorkerProfile({
      full_name: "טסט",
      hourly_rate: 35,
      language_pref: "he",
      role: "worker",
    });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([{ data: { role: "worker" }, error: null }]);

    const result = await createWorkerProfile({
      full_name: "טסט",
      hourly_rate: 35,
      language_pref: "he",
      role: "worker",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns validation error for missing name", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createWorkerProfile({
      full_name: "",
      hourly_rate: 35,
      language_pref: "he",
      role: "worker",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("שם");
    }
  });

  it("returns error for duplicate telegram ID", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: { id: "other", full_name: "דני" }, error: null }, // existing telegram_id
    ]);

    const result = await createWorkerProfile({
      full_name: "טסט",
      telegram_id: "12345",
      hourly_rate: 35,
      language_pref: "he",
      role: "worker",
    });

    expect(result).toEqual({
      success: false,
      error: "מזהה טלגרם כבר משויך ל-דני",
    });
  });

  it("creates auth user and profile on success", async () => {
    const newProfile = {
      id: "new-user-id",
      full_name: "עובד חדש",
      role: "worker",
      language_pref: "he",
      telegram_id: null,
      hourly_rate: 35,
      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller check
    ]);
    setupAdminMockChain([
      { data: newProfile, error: null }, // insert result
    ]);

    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });

    const result = await createWorkerProfile({
      full_name: "עובד חדש",
      hourly_rate: 35,
      language_pref: "he",
      role: "worker",
    });

    expect(result).toEqual({ success: true, data: newProfile });
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledOnce();
  });
});

describe("updateWorkerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when profile not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller check
    ]);
    setupAdminMockChain([
      { data: null, error: null }, // profile not found
    ]);

    const result = await updateWorkerProfile("missing-id", {
      full_name: "שם חדש",
    });

    expect(result).toEqual({ success: false, error: "פרופיל לא נמצא" });
  });

  it("updates profile and creates audit log on success", async () => {
    const beforeProfile = {
      id: "profile-1",
      full_name: "שם ישן",
      role: "worker",
      language_pref: "he",
      telegram_id: null,
      hourly_rate: 30,
      is_active: true,
    };

    const updatedProfile = {
      ...beforeProfile,
      hourly_rate: 40,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller check
    ]);
    setupAdminMockChain([
      { data: beforeProfile, error: null }, // before state
      { data: updatedProfile, error: null }, // update result
    ]);

    const result = await updateWorkerProfile("profile-1", {
      hourly_rate: 40,
    });

    expect(result).toEqual({ success: true, data: updatedProfile });
  });
});

describe("archiveWorkerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives profile and creates audit log", async () => {
    const beforeProfile = {
      id: "profile-1",
      full_name: "עובד",
      role: "worker",
      language_pref: "he",
      telegram_id: null,
      hourly_rate: 30,
      is_active: true,
    };

    const archivedProfile = {
      ...beforeProfile,
      is_active: false,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller check
    ]);
    setupAdminMockChain([
      { data: beforeProfile, error: null }, // before state
      { data: archivedProfile, error: null }, // update result
    ]);

    const result = await archiveWorkerProfile("profile-1");

    expect(result).toEqual({ success: true, data: archivedProfile });
  });

  it("returns error when profile not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller check
    ]);
    setupAdminMockChain([
      { data: null, error: null }, // not found
    ]);

    const result = await archiveWorkerProfile("missing-id");

    expect(result).toEqual({ success: false, error: "פרופיל לא נמצא" });
  });

  it("returns error when worker is already archived", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null }, // caller check
    ]);
    setupAdminMockChain([
      {
        data: {
          id: "profile-1",
          full_name: "עובד",
          role: "worker",
          language_pref: "he",
          telegram_id: null,
          hourly_rate: 30,
          is_active: false,
        },
        error: null,
      }, // already archived
    ]);

    const result = await archiveWorkerProfile("profile-1");

    expect(result).toEqual({ success: false, error: "העובד כבר גונז" });
  });
});
