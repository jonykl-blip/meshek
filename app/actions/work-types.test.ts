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

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const {
  getWorkTypes,
  getAllWorkTypes,
  createWorkType,
  updateWorkType,
  archiveWorkType,
} = await import("./work-types");

interface MockResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

function setupMockChain(results: MockResult[]) {
  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex++;
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      order: () => builder,
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (val: unknown) => void) => resolve(result),
    };
    return builder;
  });
}

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
}

// ---------- getWorkTypes ----------

describe("getWorkTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active work types", async () => {
    const workTypes = [
      {
        id: "wt-1",
        name_he: "גיזום",
        name_en: "Pruning",
        name_th: null,
        category: "field_work",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "wt-2",
        name_he: "ריסוס",
        name_en: "Spraying",
        name_th: null,
        category: "spraying",
        is_active: true,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];

    setupMockChain([{ data: workTypes, error: null }]);

    const result = await getWorkTypes();

    expect(result).toEqual(workTypes);
    expect(mockSupabase.from).toHaveBeenCalledWith("work_types");
  });

  it("returns empty array when data is null", async () => {
    setupMockChain([{ data: null, error: null }]);

    const result = await getWorkTypes();

    expect(result).toEqual([]);
  });
});

// ---------- getAllWorkTypes ----------

describe("getAllWorkTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all work types including inactive", async () => {
    const workTypes = [
      {
        id: "wt-1",
        name_he: "גיזום",
        name_en: null,
        name_th: null,
        category: "field_work",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "wt-2",
        name_he: "ריסוס",
        name_en: null,
        name_th: null,
        category: "spraying",
        is_active: false,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];

    setupMockChain([{ data: workTypes, error: null }]);

    const result = await getAllWorkTypes();

    expect(result).toEqual(workTypes);
    expect(mockSupabase.from).toHaveBeenCalledWith("work_types");
  });

  it("returns empty array when data is null", async () => {
    setupMockChain([{ data: null, error: null }]);

    const result = await getAllWorkTypes();

    expect(result).toEqual([]);
  });
});

// ---------- createWorkType ----------

describe("createWorkType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates work type with audit log", async () => {
    const newWorkType = {
      id: "wt-new",
      name_he: "קטיף",
      name_en: "Picking",
      name_th: null,
      category: "harvest",
      is_active: true,
      created_at: "2026-03-21T00:00:00Z",
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: newWorkType, error: null },
    ]);

    const result = await createWorkType({
      name_he: "קטיף",
      name_en: "Picking",
      category: "harvest",
    });

    expect(result).toEqual({ success: true, data: newWorkType });
  });

  it("returns auth error for non-admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([{ data: { role: "worker" }, error: null }]);

    const result = await createWorkType({
      name_he: "קטיף",
      category: "harvest",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createWorkType({
      name_he: "קטיף",
      category: "harvest",
    });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("validates required name_he", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createWorkType({
      name_he: "",
      category: "harvest",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("שם בעברית");
    }
  });

  it("validates required category", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createWorkType({
      name_he: "קטיף",
      category: "invalid_category",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

// ---------- updateWorkType ----------

describe("updateWorkType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates work type with audit log", async () => {
    const beforeWorkType = {
      id: "wt-1",
      name_he: "גיזום",
      name_en: null,
      name_th: null,
      category: "field_work",
      is_active: true,
    };
    const updatedWorkType = {
      ...beforeWorkType,
      name_he: "גיזום עצים",
      name_en: "Tree Pruning",
      created_at: "2026-01-01T00:00:00Z",
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeWorkType, error: null },
      { data: updatedWorkType, error: null },
    ]);

    const result = await updateWorkType("wt-1", {
      name_he: "גיזום עצים",
      name_en: "Tree Pruning",
      category: "field_work",
    });

    expect(result).toEqual({ success: true, data: updatedWorkType });
  });

  it("returns error when not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await updateWorkType("missing-id", {
      name_he: "גיזום",
      category: "field_work",
    });

    expect(result).toEqual({ success: false, error: "סוג עבודה לא נמצא" });
  });
});

// ---------- archiveWorkType ----------

describe("archiveWorkType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hard-deletes when no linked attendance_logs", async () => {
    const beforeWorkType = {
      id: "wt-1",
      name_he: "גיזום",
      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },       // verifyAdminCaller profile lookup
      { data: beforeWorkType, error: null },           // fetch work type
      { count: 0, error: null },                       // attendance_logs count
      { data: null, error: null },                     // delete result
    ]);

    const result = await archiveWorkType("wt-1");

    expect(result).toEqual({ success: true, data: { id: "wt-1" } });
  });

  it("soft-deactivates when linked attendance_logs exist", async () => {
    const beforeWorkType = {
      id: "wt-2",
      name_he: "ריסוס",
      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },       // verifyAdminCaller profile lookup
      { data: beforeWorkType, error: null },           // fetch work type
      { count: 5, error: null },                       // attendance_logs count (has references)
      { data: null, error: null },                     // update result (soft deactivate)
    ]);

    const result = await archiveWorkType("wt-2");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: "wt-2" });
      expect(result.warning).toBe(
        "סוג עבודה זה קיים בתיעוד עבודה. הושבת במקום נמחק.",
      );
    }
  });

  it("returns error when already inactive and has linked logs", async () => {
    const beforeWorkType = {
      id: "wt-3",
      name_he: "השקיה",
      is_active: false,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },       // verifyAdminCaller profile lookup
      { data: beforeWorkType, error: null },           // fetch work type
      { count: 3, error: null },                       // attendance_logs count (has references)
    ]);

    const result = await archiveWorkType("wt-3");

    expect(result).toEqual({
      success: false,
      error: "סוג העבודה כבר לא פעיל",
    });
  });

  it("returns error when not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },       // verifyAdminCaller profile lookup
      { data: null, error: null },                     // work type not found
    ]);

    const result = await archiveWorkType("missing-id");

    expect(result).toEqual({ success: false, error: "סוג עבודה לא נמצא" });
  });
});
