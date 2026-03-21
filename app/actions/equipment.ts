"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { equipmentSchema } from "@/lib/validators/equipment";
import { revalidatePath } from "next/cache";

export interface Equipment {
  id: string;
  name: string;
  is_active: boolean;
}

export async function getEquipment(): Promise<Equipment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment")
    .select("id, name, is_active")
    .eq("is_active", true)
    .order("name");

  return data ?? [];
}

export async function createEquipment(
  input: { name: string },
): Promise<ActionResult<Equipment>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newEquipment, error } = await supabase
    .from("equipment")
    .insert({ name: parsed.data.name })
    .select("id, name, is_active")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "equipment",
    recordId: newEquipment.id,
    action: "create",
    before: null,
    after: newEquipment,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: newEquipment };
}

export async function updateEquipment(
  equipmentId: string,
  input: { name: string },
): Promise<ActionResult<Equipment>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: beforeEquipment } = await supabase
    .from("equipment")
    .select("id, name, is_active")
    .eq("id", equipmentId)
    .single();

  if (!beforeEquipment) {
    return { success: false, error: "ציוד לא נמצא" };
  }

  const { data: updated, error } = await supabase
    .from("equipment")
    .update({ name: parsed.data.name })
    .eq("id", equipmentId)
    .select("id, name, is_active")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "equipment",
    recordId: equipmentId,
    action: "edit",
    before: beforeEquipment,
    after: updated,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: updated };
}

export async function archiveEquipment(
  equipmentId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeEquipment } = await supabase
    .from("equipment")
    .select("id, name, is_active")
    .eq("id", equipmentId)
    .single();

  if (!beforeEquipment) {
    return { success: false, error: "ציוד לא נמצא" };
  }

  if (!beforeEquipment.is_active) {
    return { success: false, error: "הציוד כבר גונז" };
  }

  const { error } = await supabase
    .from("equipment")
    .update({ is_active: false })
    .eq("id", equipmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "equipment",
    recordId: equipmentId,
    action: "archive",
    before: beforeEquipment,
    after: { ...beforeEquipment, is_active: false },
  });

  revalidatePath("/admin/settings");
  return { success: true, data: { id: equipmentId } };
}
