import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  getMaterials,
  getAllMaterials,
  createMaterial,
  updateMaterial,
  archiveMaterial,
} from "./materials";

// ---------------------------------------------------------------------------
// Mock chain helper
// ---------------------------------------------------------------------------

function setupMockChain(results: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;
  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(() => results[callIndex++] ?? { data: null, error: null }),
  };
  const fromFn = vi.fn(() => {
    const proxy = new Proxy(chainMethods, {
      get(target, prop) {
        if (prop === "then") {
          const result = results[callIndex++] ?? { data: null, error: null };
          return (resolve: (val: unknown) => void) => resolve(result);
        }
        return target[prop as keyof typeof target];
      },
    });
    return proxy;
  });
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    from: fromFn,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-user-id" } },
      }),
    },
  });
  return { fromFn, chainMethods };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const fakeMaterial = {
  id: "mat-1",
  name_he: "דשן אורגני",
  name_en: "Organic fertilizer",
  category: "fertilizer",
  default_unit: "kg",
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
};

const adminProfile = { role: "admin" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMaterials
// ---------------------------------------------------------------------------

describe("getMaterials", () => {
  it("returns active materials", async () => {
    // getMaterials: from("materials").select().eq().order() — resolves as thenable
    setupMockChain([{ data: [fakeMaterial], error: null }]);

    const result = await getMaterials();

    expect(result).toEqual([fakeMaterial]);
  });

  it("returns empty array when data is null", async () => {
    setupMockChain([{ data: null, error: null }]);

    const result = await getMaterials();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAllMaterials
// ---------------------------------------------------------------------------

describe("getAllMaterials", () => {
  it("returns all materials including inactive", async () => {
    const inactiveMaterial = { ...fakeMaterial, id: "mat-2", is_active: false };
    setupMockChain([
      { data: [fakeMaterial, inactiveMaterial], error: null },
    ]);

    const result = await getAllMaterials();

    expect(result).toEqual([fakeMaterial, inactiveMaterial]);
  });

  it("returns empty array when data is null", async () => {
    setupMockChain([{ data: null, error: null }]);

    const result = await getAllMaterials();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createMaterial
// ---------------------------------------------------------------------------

describe("createMaterial", () => {
  it("creates material with audit log", async () => {
    // Call sequence:
    // 1. verifyAdminCaller -> from("profiles").select().eq().single() — returns admin profile
    // 2. from("materials").insert().select().single() — returns new material
    setupMockChain([
      { data: adminProfile, error: null },
      { data: fakeMaterial, error: null },
    ]);

    const result = await createMaterial({
      name_he: "דשן אורגני",
      name_en: "Organic fertilizer",
      category: "fertilizer",
      default_unit: "kg",
    });

    expect(result).toEqual({ success: true, data: fakeMaterial });
    expect(logAudit).toHaveBeenCalledWith({
      actorId: "admin-user-id",
      tableName: "materials",
      recordId: "mat-1",
      action: "create",
      before: null,
      after: fakeMaterial,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings");
  });

  it("returns auth error for non-admin", async () => {
    // verifyAdminCaller -> profile has worker role -> denied
    setupMockChain([
      { data: { role: "worker" }, error: null },
    ]);

    const result = await createMaterial({
      name_he: "דשן",
      category: "fertilizer",
    });

    expect(result).toEqual({ success: false, error: "אין הרשאה" });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns auth error when not authenticated", async () => {
    // auth.getUser returns no user
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const result = await createMaterial({
      name_he: "דשן",
      category: "fertilizer",
    });

    expect(result).toEqual({ success: false, error: "לא מאומת" });
  });

  it("validates required name_he", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
    ]);

    const result = await createMaterial({
      name_he: "",
      category: "fertilizer",
    });

    expect(result).toEqual({
      success: false,
      error: "שם בעברית הוא שדה חובה",
    });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("validates required category", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
    ]);

    const result = await createMaterial({
      name_he: "דשן",
      category: "invalid_category" as "fertilizer",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns error when insert fails", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
      { data: null, error: { message: "DB insert error" } },
    ]);

    const result = await createMaterial({
      name_he: "דשן",
      category: "fertilizer",
    });

    expect(result).toEqual({ success: false, error: "DB insert error" });
    expect(logAudit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateMaterial
// ---------------------------------------------------------------------------

describe("updateMaterial", () => {
  it("updates material with audit log", async () => {
    const updatedMaterial = { ...fakeMaterial, name_he: "דשן משופר" };
    // Call sequence:
    // 1. verifyAdminCaller -> from("profiles").select().eq().single()
    // 2. fetch before -> from("materials").select().eq().single()
    // 3. update -> from("materials").update().eq().select().single()
    setupMockChain([
      { data: adminProfile, error: null },
      { data: fakeMaterial, error: null },
      { data: updatedMaterial, error: null },
    ]);

    const result = await updateMaterial("mat-1", {
      name_he: "דשן משופר",
      category: "fertilizer",
      default_unit: "kg",
    });

    expect(result).toEqual({ success: true, data: updatedMaterial });
    expect(logAudit).toHaveBeenCalledWith({
      actorId: "admin-user-id",
      tableName: "materials",
      recordId: "mat-1",
      action: "edit",
      before: fakeMaterial,
      after: updatedMaterial,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings");
  });

  it("returns error when material not found", async () => {
    // verifyAdminCaller succeeds, but fetch-before returns null
    setupMockChain([
      { data: adminProfile, error: null },
      { data: null, error: null },
    ]);

    const result = await updateMaterial("nonexistent-id", {
      name_he: "דשן",
      category: "fertilizer",
    });

    expect(result).toEqual({ success: false, error: "חומר לא נמצא" });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns validation error for empty name_he", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
    ]);

    const result = await updateMaterial("mat-1", {
      name_he: "",
      category: "fertilizer",
    });

    expect(result).toEqual({
      success: false,
      error: "שם בעברית הוא שדה חובה",
    });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns error when update query fails", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
      { data: fakeMaterial, error: null },
      { data: null, error: { message: "DB update error" } },
    ]);

    const result = await updateMaterial("mat-1", {
      name_he: "דשן",
      category: "fertilizer",
    });

    expect(result).toEqual({ success: false, error: "DB update error" });
    expect(logAudit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// archiveMaterial
// ---------------------------------------------------------------------------

describe("archiveMaterial", () => {
  it("archives material (soft-disable) with audit log", async () => {
    // Call sequence:
    // 1. verifyAdminCaller -> from("profiles").select().eq().single()
    // 2. fetch before -> from("materials").select().eq().single()
    // 3. update is_active=false -> from("materials").update().eq() — thenable (no .single())
    setupMockChain([
      { data: adminProfile, error: null },
      {
        data: { id: "mat-1", name_he: "דשן אורגני", is_active: true },
        error: null,
      },
      { data: null, error: null },
    ]);

    const result = await archiveMaterial("mat-1");

    expect(result).toEqual({ success: true, data: { id: "mat-1" } });
    expect(logAudit).toHaveBeenCalledWith({
      actorId: "admin-user-id",
      tableName: "materials",
      recordId: "mat-1",
      action: "archive",
      before: { id: "mat-1", name_he: "דשן אורגני", is_active: true },
      after: { id: "mat-1", name_he: "דשן אורגני", is_active: false },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings");
  });

  it("returns error when already archived", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
      {
        data: { id: "mat-1", name_he: "דשן אורגני", is_active: false },
        error: null,
      },
    ]);

    const result = await archiveMaterial("mat-1");

    expect(result).toEqual({ success: false, error: "החומר כבר גונז" });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns error when material not found", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
      { data: null, error: null },
    ]);

    const result = await archiveMaterial("nonexistent-id");

    expect(result).toEqual({ success: false, error: "חומר לא נמצא" });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("returns error when update query fails", async () => {
    setupMockChain([
      { data: adminProfile, error: null },
      {
        data: { id: "mat-1", name_he: "דשן אורגני", is_active: true },
        error: null,
      },
      { data: null, error: { message: "DB update error" } },
    ]);

    const result = await archiveMaterial("mat-1");

    expect(result).toEqual({ success: false, error: "DB update error" });
    expect(logAudit).not.toHaveBeenCalled();
  });
});
