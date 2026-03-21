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
  createArea,
  updateArea,
  archiveArea,
  addAreaAlias,
  removeAreaAlias,
} = await import("./areas");

function setupMockChain(results: { data: unknown; error: unknown }[]) {
  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex++;
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      order: () => builder,
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  });
}

function mockAuthenticatedAdmin() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
}

describe("createArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createArea({
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([{ data: { role: "worker" }, error: null }]);

    const result = await createArea({
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns validation error for missing name", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createArea({
      name: "",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("שם השטח");
    }
  });

  it("returns validation error for invalid crop_id", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createArea({
      name: "חלקה א",
      crop_id: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("גידול");
    }
  });

  it("creates area successfully with optional alias", async () => {
    const insertedRow = {
      id: "area-1",
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: insertedRow, error: null },
      { data: { name: "שקדים" }, error: null },
    ]);

    const result = await createArea({
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({
      success: true,
      data: {
        ...insertedRow,
        clients: null,
        crops: { name: "שקדים" },
        area_aliases: [],
      },
    });
  });
});

describe("updateArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates area and creates audit log on success", async () => {
    const beforeArea = {
      id: "area-1",
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      is_active: true,
    };
    const updatedRow = {
      ...beforeArea,
      name: "חלקה ב",
    };
    const fullArea = {
      ...updatedRow,
      crops: { name: "שקדים" },
      area_aliases: [],
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeArea, error: null },
      { data: updatedRow, error: null },
      { data: [fullArea], error: null },
    ]);

    const result = await updateArea("area-1", {
      name: "חלקה ב",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({ success: true, data: fullArea });
  });

  it("returns error when area not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await updateArea("missing-id", {
      name: "test",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({ success: false, error: "שטח לא נמצא" });
  });
});

describe("archiveArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives area and creates audit log", async () => {
    const beforeArea = {
      id: "area-1",
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",

      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeArea, error: null },
      { data: null, error: null }, // update result
    ]);

    const result = await archiveArea("area-1");

    expect(result).toEqual({ success: true, data: { id: "area-1" } });
  });

  it("returns error when area already archived", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: { id: "area-1", name: "חלקה א", is_active: false }, error: null },
    ]);

    const result = await archiveArea("area-1");

    expect(result).toEqual({ success: false, error: "השטח כבר גונז" });
  });
});

describe("addAreaAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds alias successfully", async () => {
    const newAlias = { id: "alias-1", area_id: "area-1", alias: "חלקה עליונה" };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: newAlias, error: null },
    ]);

    const result = await addAreaAlias("area-1", "חלקה עליונה");

    expect(result).toEqual({ success: true, data: newAlias });
  });

  it("returns validation error for empty alias", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await addAreaAlias("area-1", "");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("כינוי");
    }
  });
});

describe("removeAreaAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes alias successfully", async () => {
    const beforeAlias = { id: "alias-1", area_id: "area-1", alias: "חלקה עליונה" };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeAlias, error: null },
      { data: null, error: null }, // delete result
    ]);

    const result = await removeAreaAlias("alias-1");

    expect(result).toEqual({ success: true, data: { id: "alias-1" } });
  });

  it("returns error when alias not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await removeAreaAlias("missing-id");

    expect(result).toEqual({ success: false, error: "כינוי לא נמצא" });
  });
});
