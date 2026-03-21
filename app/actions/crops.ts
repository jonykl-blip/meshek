"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { cropSchema } from "@/lib/validators/crop";
import { revalidatePath } from "next/cache";

export interface Crop {
  id: string;
  name: string;
}

export async function getCrops(): Promise<Crop[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crops")
    .select("id, name")
    .order("name");

  return data ?? [];
}

export async function createCrop(
  input: { name: string },
): Promise<ActionResult<Crop>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = cropSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newCrop, error } = await supabase
    .from("crops")
    .insert({ name: parsed.data.name })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "גידול בשם זה כבר קיים" };
    }
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "crops",
    recordId: newCrop.id,
    action: "create",
    before: null,
    after: newCrop,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: newCrop };
}

export async function updateCrop(
  cropId: string,
  input: { name: string },
): Promise<ActionResult<Crop>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = cropSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: beforeCrop } = await supabase
    .from("crops")
    .select("id, name")
    .eq("id", cropId)
    .single();

  if (!beforeCrop) {
    return { success: false, error: "גידול לא נמצא" };
  }

  const { data: updated, error } = await supabase
    .from("crops")
    .update({ name: parsed.data.name })
    .eq("id", cropId)
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "גידול בשם זה כבר קיים" };
    }
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "crops",
    recordId: cropId,
    action: "edit",
    before: beforeCrop,
    after: updated,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: updated };
}

export async function deleteCrop(
  cropId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeCrop } = await supabase
    .from("crops")
    .select("id, name")
    .eq("id", cropId)
    .single();

  if (!beforeCrop) {
    return { success: false, error: "גידול לא נמצא" };
  }

  const { data: associatedAreas } = await supabase
    .from("areas")
    .select("id")
    .eq("crop_id", cropId)
    .limit(1);

  if (associatedAreas && associatedAreas.length > 0) {
    return { success: false, error: "לא ניתן למחוק גידול שמשויכות אליו חלקות" };
  }

  const { error } = await supabase
    .from("crops")
    .delete()
    .eq("id", cropId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "crops",
    recordId: cropId,
    action: "archive",
    before: beforeCrop,
    after: null,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: { id: cropId } };
}
