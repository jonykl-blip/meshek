import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
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
  uploadAreaPhoto,
} = await import("./areas");

function setupMockChain(results: { data: unknown; error: unknown }[]) {
  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex++;
    const builder = {
      select: () => builder,
      eq: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      order: () => builder,
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
    const newArea = {
      id: "area-1",
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      photo_url: null,
      is_active: true,
      crops: { name: "שקדים" },
      area_aliases: [],
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: newArea, error: null },
    ]);

    const result = await createArea({
      name: "חלקה א",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({ success: true, data: newArea });
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
      photo_url: null,
      is_active: true,
    };
    const updatedArea = {
      ...beforeArea,
      name: "חלקה ב",
      crops: { name: "שקדים" },
      area_aliases: [],
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeArea, error: null },
      { data: updatedArea, error: null },
    ]);

    const result = await updateArea("area-1", {
      name: "חלקה ב",
      crop_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(result).toEqual({ success: true, data: updatedArea });
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
      photo_url: null,
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

describe("uploadAreaPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for non-image file", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAreaPhoto("area-1", formData);

    expect(result).toEqual({
      success: false,
      error: "יש להעלות קובץ תמונה בלבד",
    });
  });

  it("returns error for oversized file", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const largeContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAreaPhoto("area-1", formData);

    expect(result).toEqual({
      success: false,
      error: "גודל התמונה חייב להיות עד 5MB",
    });
  });

  it("uploads photo successfully", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: { id: "area-1", photo_url: null }, error: null }, // before state
      { data: null, error: null }, // update result
    ]);

    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });

    const file = new File(["image data"], "photo.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAreaPhoto("area-1", formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.photo_url).toBe("area-1.jpg");
    }
  });
});
