"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { workTypeSchema } from "@/lib/validators/work-type";
import { revalidatePath } from "next/cache";

export interface WorkType {
  id: string;
  name_he: string;
  name_en: string | null;
  name_th: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
}

export async function getWorkTypes(): Promise<WorkType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("work_types")
    .select("id, name_he, name_en, name_th, category, is_active, created_at")
    .eq("is_active", true)
    .order("name_he");

  return (data ?? []) as WorkType[];
}

export async function getAllWorkTypes(): Promise<WorkType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("work_types")
    .select("id, name_he, name_en, name_th, category, is_active, created_at")
    .order("name_he");

  return (data ?? []) as WorkType[];
}

export async function createWorkType(
  input: {
    name_he: string;
    name_en?: string;
    name_th?: string;
    category: string;
  },
): Promise<ActionResult<WorkType>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = workTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newWorkType, error } = await supabase
    .from("work_types")
    .insert({
      name_he: parsed.data.name_he,
      name_en: parsed.data.name_en,
      name_th: parsed.data.name_th,
      category: parsed.data.category,
    })
    .select("id, name_he, name_en, name_th, category, is_active, created_at")
    .single();

  if (error || !newWorkType) {
    return { success: false, error: error?.message ?? "שגיאה ביצירת סוג עבודה" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "work_types",
    recordId: newWorkType.id,
    action: "create",
    before: null,
    after: newWorkType,
  });

  revalidatePath("/admin/work-types");
  return { success: true, data: newWorkType as WorkType };
}

export async function updateWorkType(
  workTypeId: string,
  input: {
    name_he: string;
    name_en?: string;
    name_th?: string;
    category: string;
  },
): Promise<ActionResult<WorkType>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = workTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: beforeWorkType } = await supabase
    .from("work_types")
    .select("id, name_he, name_en, name_th, category, is_active")
    .eq("id", workTypeId)
    .single();

  if (!beforeWorkType) {
    return { success: false, error: "סוג עבודה לא נמצא" };
  }

  const { data: updatedRow, error } = await supabase
    .from("work_types")
    .update({
      name_he: parsed.data.name_he,
      name_en: parsed.data.name_en,
      name_th: parsed.data.name_th,
      category: parsed.data.category,
    })
    .eq("id", workTypeId)
    .select("id, name_he, name_en, name_th, category, is_active, created_at")
    .single();

  if (error || !updatedRow) {
    return { success: false, error: error?.message ?? "שגיאה בעדכון סוג עבודה" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "work_types",
    recordId: workTypeId,
    action: "edit",
    before: beforeWorkType,
    after: updatedRow,
  });

  revalidatePath("/admin/work-types");
  return { success: true, data: updatedRow as WorkType };
}

export async function archiveWorkType(
  workTypeId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeWorkType } = await supabase
    .from("work_types")
    .select("id, name_he, is_active")
    .eq("id", workTypeId)
    .single();

  if (!beforeWorkType) {
    return { success: false, error: "סוג עבודה לא נמצא" };
  }

  // Check if any attendance_logs reference this work type
  const { count } = await supabase
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .eq("work_type_id", workTypeId);

  if (count && count > 0) {
    // Cannot hard-delete — deactivate instead
    if (!beforeWorkType.is_active) {
      return { success: false, error: "סוג העבודה כבר לא פעיל" };
    }

    const { error } = await supabase
      .from("work_types")
      .update({ is_active: false })
      .eq("id", workTypeId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAudit({
      actorId: user.id,
      tableName: "work_types",
      recordId: workTypeId,
      action: "archive",
      before: beforeWorkType,
      after: { ...beforeWorkType, is_active: false },
    });

    revalidatePath("/admin/work-types");
    return {
      success: true,
      data: { id: workTypeId },
      warning: "סוג עבודה זה קיים בתיעוד עבודה. הושבת במקום נמחק.",
    } as ActionResult<{ id: string }>;
  }

  // No references — safe to hard-delete
  const { error } = await supabase
    .from("work_types")
    .delete()
    .eq("id", workTypeId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "work_types",
    recordId: workTypeId,
    action: "archive",
    before: beforeWorkType,
    after: null,
  });

  revalidatePath("/admin/work-types");
  return { success: true, data: { id: workTypeId } };
}
