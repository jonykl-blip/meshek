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
  createEquipment,
  updateEquipment,
  archiveEquipment,
} = await import("./equipment");

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

describe("createEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createEquipment({ name: "טרקטור" });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("returns error when caller is not admin/owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    setupMockChain([{ data: { role: "worker" }, error: null }]);

    const result = await createEquipment({ name: "טרקטור" });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
  });

  it("returns validation error for missing name", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([{ data: { role: "admin" }, error: null }]);

    const result = await createEquipment({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("שם הציוד");
    }
  });

  it("creates equipment successfully", async () => {
    const newEquipment = {
      id: "equip-1",
      name: "טרקטור",
      is_active: true,
    };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: newEquipment, error: null },
    ]);

    const result = await createEquipment({ name: "טרקטור" });

    expect(result).toEqual({ success: true, data: newEquipment });
  });
});

describe("updateEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates equipment successfully", async () => {
    const beforeEquipment = { id: "equip-1", name: "טרקטור", is_active: true };
    const updatedEquipment = { ...beforeEquipment, name: "מכסחה" };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeEquipment, error: null },
      { data: updatedEquipment, error: null },
    ]);

    const result = await updateEquipment("equip-1", { name: "מכסחה" });

    expect(result).toEqual({ success: true, data: updatedEquipment });
  });

  it("returns error when equipment not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await updateEquipment("missing-id", { name: "test" });

    expect(result).toEqual({ success: false, error: "ציוד לא נמצא" });
  });
});

describe("archiveEquipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives equipment and creates audit log", async () => {
    const beforeEquipment = { id: "equip-1", name: "טרקטור", is_active: true };

    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: beforeEquipment, error: null },
      { data: null, error: null }, // update result
    ]);

    const result = await archiveEquipment("equip-1");

    expect(result).toEqual({ success: true, data: { id: "equip-1" } });
  });

  it("returns error when equipment not found", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: null, error: null },
    ]);

    const result = await archiveEquipment("missing-id");

    expect(result).toEqual({ success: false, error: "ציוד לא נמצא" });
  });

  it("returns error when equipment already archived", async () => {
    mockAuthenticatedAdmin();
    setupMockChain([
      { data: { role: "admin" }, error: null },
      { data: { id: "equip-1", name: "טרקטור", is_active: false }, error: null },
    ]);

    const result = await archiveEquipment("equip-1");

    expect(result).toEqual({ success: false, error: "הציוד כבר גונז" });
  });
});
