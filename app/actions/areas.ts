"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { areaSchema, areaAliasSchema } from "@/lib/validators/area";
import { OWN_FARM_CLIENT_ID } from "@/lib/constants";
import { revalidatePath } from "next/cache";

export interface Area {
  id: string;
  name: string;
  crop_id: string;
  client_id: string;
  is_own_field: boolean;
  total_area_dunam: number | null;
  is_active: boolean;
  crops: { name: string } | null;
  clients: { name: string; is_own_farm: boolean } | null;
  area_aliases: { id: string; alias: string }[];
}

interface AreaAlias {
  id: string;
  area_id: string;
  alias: string;
}

export async function getAreasWithAliases(): Promise<Area[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("areas")
    .select("id, name, crop_id, client_id, is_own_field, total_area_dunam, is_active, crops(name), clients(name, is_own_farm), area_aliases(id, alias)")
    .eq("is_active", true)
    .order("name");

  return (data as unknown as Area[]) ?? [];
}

export async function getCrops(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crops")
    .select("id, name")
    .order("name");

  return data ?? [];
}

export async function createCrop(
  input: { name: string },
): Promise<ActionResult<{ id: string; name: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "שם הגידול הוא שדה חובה" };
  }

  const { data: newCrop, error } = await supabase
    .from("crops")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
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

  revalidatePath("/admin/areas");
  return { success: true, data: newCrop };
}

export async function createArea(
  input: {
    name: string;
    crop_id: string;
    alias?: string;
    client_id?: string;
    is_own_field?: boolean;
    total_area_dunam?: number | null;
  },
): Promise<ActionResult<Area>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const isOwnField = input.is_own_field !== false;
  const clientId = isOwnField ? OWN_FARM_CLIENT_ID : input.client_id;

  if (!isOwnField && !clientId) {
    return { success: false, error: "יש לבחור לקוח עבור שדה קבלני" };
  }

  const insertPayload: Record<string, unknown> = {
    name: parsed.data.name,
    crop_id: parsed.data.crop_id,
    client_id: clientId,
    is_own_field: isOwnField,
  };
  if (input.total_area_dunam != null && input.total_area_dunam > 0) {
    insertPayload.total_area_dunam = input.total_area_dunam;
  }

  const { data: newAreaRow, error } = await supabase
    .from("areas")
    .insert(insertPayload)
    .select("id, name, crop_id, client_id, is_own_field, total_area_dunam, is_active")
    .single();

  if (error || !newAreaRow) {
    return { success: false, error: error?.message ?? "שגיאה ביצירת שטח" };
  }

  const newArea = {
    ...newAreaRow,
    crops: null as { name: string } | null,
    clients: null as { name: string; is_own_farm: boolean } | null,
    area_aliases: [] as { id: string; alias: string }[],
  };

  // Fetch crop name separately
  const { data: crop } = await supabase
    .from("crops")
    .select("name")
    .eq("id", parsed.data.crop_id)
    .single();
  if (crop) newArea.crops = crop;

  await logAudit({
    actorId: user.id,
    tableName: "areas",
    recordId: newArea.id,
    action: "create",
    before: null,
    after: newArea,
  });

  if (input.alias?.trim()) {
    const aliasParsed = areaAliasSchema.safeParse({ alias: input.alias.trim() });
    if (aliasParsed.success) {
      const { data: newAlias } = await supabase
        .from("area_aliases")
        .insert({ area_id: newArea.id, alias: aliasParsed.data.alias })
        .select("id, area_id, alias")
        .single();

      if (newAlias) {
        await logAudit({
          actorId: user.id,
          tableName: "area_aliases",
          recordId: newAlias.id,
          action: "create",
          before: null,
          after: newAlias,
        });
      }
    }
  }

  revalidatePath("/admin/areas");
  return { success: true, data: newArea as unknown as Area };
}

export async function updateArea(
  areaId: string,
  input: {
    name: string;
    crop_id: string;
    client_id?: string;
    is_own_field?: boolean;
    total_area_dunam?: number | null;
  },
): Promise<ActionResult<Area>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: beforeArea } = await supabase
    .from("areas")
    .select("id, name, crop_id, client_id, is_own_field, total_area_dunam, is_active")
    .eq("id", areaId)
    .single();

  if (!beforeArea) {
    return { success: false, error: "שטח לא נמצא" };
  }

  const isOwnField = input.is_own_field !== false;
  const clientId = isOwnField ? OWN_FARM_CLIENT_ID : (input.client_id ?? beforeArea.client_id);

  const updatePayload: Record<string, unknown> = {
    name: parsed.data.name,
    crop_id: parsed.data.crop_id,
    client_id: clientId,
    is_own_field: isOwnField,
  };
  if (input.total_area_dunam !== undefined) {
    updatePayload.total_area_dunam = input.total_area_dunam;
  }

  const { data: updatedRow, error } = await supabase
    .from("areas")
    .update(updatePayload)
    .eq("id", areaId)
    .select("id, name, crop_id, client_id, is_own_field, total_area_dunam, is_active")
    .single();

  if (error || !updatedRow) {
    return { success: false, error: error?.message ?? "שגיאה בעדכון שטח" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "areas",
    recordId: areaId,
    action: "edit",
    before: beforeArea,
    after: updatedRow,
  });

  // Fetch full area with relations for return (avoid .single() with embedded joins)
  const { data: fullAreas } = await supabase
    .from("areas")
    .select("id, name, crop_id, client_id, is_own_field, total_area_dunam, is_active, crops(name), clients(name, is_own_farm), area_aliases(id, alias)")
    .eq("id", areaId);

  revalidatePath("/admin/areas");
  const fullArea = fullAreas?.[0] as unknown as Area | undefined;
  return { success: true, data: fullArea ?? (updatedRow as unknown as Area) };
}

export async function archiveArea(
  areaId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeArea } = await supabase
    .from("areas")
    .select("id, name, crop_id, is_active")
    .eq("id", areaId)
    .single();

  if (!beforeArea) {
    return { success: false, error: "שטח לא נמצא" };
  }

  if (!beforeArea.is_active) {
    return { success: false, error: "השטח כבר גונז" };
  }

  const { error } = await supabase
    .from("areas")
    .update({ is_active: false })
    .eq("id", areaId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "areas",
    recordId: areaId,
    action: "archive",
    before: beforeArea,
    after: { ...beforeArea, is_active: false },
  });

  revalidatePath("/admin/areas");
  return { success: true, data: { id: areaId } };
}

export async function addAreaAlias(
  areaId: string,
  alias: string,
): Promise<ActionResult<AreaAlias>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = areaAliasSchema.safeParse({ alias });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newAlias, error } = await supabase
    .from("area_aliases")
    .insert({ area_id: areaId, alias: parsed.data.alias })
    .select("id, area_id, alias")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "area_aliases",
    recordId: newAlias.id,
    action: "create",
    before: null,
    after: newAlias,
  });

  revalidatePath("/admin/areas");
  return { success: true, data: newAlias };
}

export async function removeAreaAlias(
  aliasId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeAlias } = await supabase
    .from("area_aliases")
    .select("id, area_id, alias")
    .eq("id", aliasId)
    .single();

  if (!beforeAlias) {
    return { success: false, error: "כינוי לא נמצא" };
  }

  const { error } = await supabase
    .from("area_aliases")
    .delete()
    .eq("id", aliasId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "area_aliases",
    recordId: aliasId,
    action: "archive",
    before: beforeAlias,
    after: null,
  });

  revalidatePath("/admin/areas");
  return { success: true, data: { id: aliasId } };
}
