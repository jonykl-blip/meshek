"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { materialSchema } from "@/lib/validators/material";
import { revalidatePath } from "next/cache";

export interface Material {
  id: string;
  name_he: string;
  name_en: string | null;
  category: string;
  default_unit: string | null;
  is_active: boolean;
  created_at: string;
}

export async function getMaterials(): Promise<Material[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("materials")
    .select("id, name_he, name_en, category, default_unit, is_active, created_at")
    .eq("is_active", true)
    .order("name_he");

  return (data ?? []) as Material[];
}

export async function getAllMaterials(): Promise<Material[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("materials")
    .select("id, name_he, name_en, category, default_unit, is_active, created_at")
    .order("name_he");

  return (data ?? []) as Material[];
}

export async function createMaterial(
  input: {
    name_he: string;
    name_en?: string;
    category: string;
    default_unit?: string;
  },
): Promise<ActionResult<Material>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newMaterial, error } = await supabase
    .from("materials")
    .insert({
      name_he: parsed.data.name_he,
      name_en: parsed.data.name_en,
      category: parsed.data.category,
      default_unit: parsed.data.default_unit,
    })
    .select("id, name_he, name_en, category, default_unit, is_active, created_at")
    .single();

  if (error || !newMaterial) {
    return { success: false, error: error?.message ?? "שגיאה ביצירת חומר" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "materials",
    recordId: newMaterial.id,
    action: "create",
    before: null,
    after: newMaterial,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: newMaterial as Material };
}

export async function updateMaterial(
  materialId: string,
  input: {
    name_he: string;
    name_en?: string;
    category: string;
    default_unit?: string;
  },
): Promise<ActionResult<Material>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: beforeMaterial } = await supabase
    .from("materials")
    .select("id, name_he, name_en, category, default_unit, is_active")
    .eq("id", materialId)
    .single();

  if (!beforeMaterial) {
    return { success: false, error: "חומר לא נמצא" };
  }

  const { data: updatedRow, error } = await supabase
    .from("materials")
    .update({
      name_he: parsed.data.name_he,
      name_en: parsed.data.name_en,
      category: parsed.data.category,
      default_unit: parsed.data.default_unit,
    })
    .eq("id", materialId)
    .select("id, name_he, name_en, category, default_unit, is_active, created_at")
    .single();

  if (error || !updatedRow) {
    return { success: false, error: error?.message ?? "שגיאה בעדכון חומר" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "materials",
    recordId: materialId,
    action: "edit",
    before: beforeMaterial,
    after: updatedRow,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: updatedRow as Material };
}

export async function archiveMaterial(
  materialId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeMaterial } = await supabase
    .from("materials")
    .select("id, name_he, is_active")
    .eq("id", materialId)
    .single();

  if (!beforeMaterial) {
    return { success: false, error: "חומר לא נמצא" };
  }

  if (!beforeMaterial.is_active) {
    return { success: false, error: "החומר כבר גונז" };
  }

  const { error } = await supabase
    .from("materials")
    .update({ is_active: false })
    .eq("id", materialId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "materials",
    recordId: materialId,
    action: "archive",
    before: beforeMaterial,
    after: { ...beforeMaterial, is_active: false },
  });

  revalidatePath("/admin/settings");
  return { success: true, data: { id: materialId } };
}
