"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { clientSchema, clientAliasSchema } from "@/lib/validators/client";
import { OWN_FARM_CLIENT_ID } from "@/lib/constants";
import { revalidatePath } from "next/cache";

export interface Client {
  id: string;
  name: string;
  name_en: string | null;
  is_own_farm: boolean;
  phone: string | null;
  notes: string | null;
  rate_per_dunam: number | null;
  rate_per_hour: number | null;
  is_active: boolean;
  created_at: string;
  client_aliases: { id: string; alias: string }[];
}

interface ClientAlias {
  id: string;
  client_id: string;
  alias: string;
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, name_en, is_own_farm, phone, notes, rate_per_dunam, rate_per_hour, is_active, created_at, client_aliases(id, alias)",
    )
    .eq("is_active", true)
    .order("is_own_farm", { ascending: false })
    .order("name");

  return (data as unknown as Client[]) ?? [];
}

export async function getAllClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, name_en, is_own_farm, phone, notes, rate_per_dunam, rate_per_hour, is_active, created_at, client_aliases(id, alias)",
    )
    .order("is_own_farm", { ascending: false })
    .order("name");

  return (data as unknown as Client[]) ?? [];
}

export async function createClientAction(
  input: {
    name: string;
    name_en?: string;
    phone?: string;
    notes?: string;
    rate_per_dunam?: number | null;
    rate_per_hour?: number | null;
  },
): Promise<ActionResult<Client>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({
      name: parsed.data.name,
      name_en: parsed.data.name_en,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      rate_per_dunam: parsed.data.rate_per_dunam,
      rate_per_hour: parsed.data.rate_per_hour,
    })
    .select(
      "id, name, name_en, is_own_farm, phone, notes, rate_per_dunam, rate_per_hour, is_active, created_at",
    )
    .single();

  if (error || !newClient) {
    return { success: false, error: error?.message ?? "שגיאה ביצירת לקוח" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "clients",
    recordId: newClient.id,
    action: "create",
    before: null,
    after: newClient,
  });

  revalidatePath("/admin/clients");
  return {
    success: true,
    data: { ...newClient, client_aliases: [] } as unknown as Client,
  };
}

export async function updateClient(
  clientId: string,
  input: {
    name: string;
    name_en?: string;
    phone?: string;
    notes?: string;
    rate_per_dunam?: number | null;
    rate_per_hour?: number | null;
  },
): Promise<ActionResult<Client>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: beforeClient } = await supabase
    .from("clients")
    .select("id, name, name_en, is_own_farm, phone, notes, rate_per_dunam, rate_per_hour, is_active")
    .eq("id", clientId)
    .single();

  if (!beforeClient) {
    return { success: false, error: "לקוח לא נמצא" };
  }

  if (beforeClient.is_own_farm) {
    return { success: false, error: "לא ניתן לערוך את לקוח המשק" };
  }

  const { data: updatedRow, error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      name_en: parsed.data.name_en,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      rate_per_dunam: parsed.data.rate_per_dunam,
      rate_per_hour: parsed.data.rate_per_hour,
    })
    .eq("id", clientId)
    .select(
      "id, name, name_en, is_own_farm, phone, notes, rate_per_dunam, rate_per_hour, is_active, created_at",
    )
    .single();

  if (error || !updatedRow) {
    return { success: false, error: error?.message ?? "שגיאה בעדכון לקוח" };
  }

  await logAudit({
    actorId: user.id,
    tableName: "clients",
    recordId: clientId,
    action: "edit",
    before: beforeClient,
    after: updatedRow,
  });

  const { data: fullClients } = await supabase
    .from("clients")
    .select(
      "id, name, name_en, is_own_farm, phone, notes, rate_per_dunam, rate_per_hour, is_active, created_at, client_aliases(id, alias)",
    )
    .eq("id", clientId);

  revalidatePath("/admin/clients");
  const fullClient = fullClients?.[0] as unknown as Client | undefined;
  return { success: true, data: fullClient ?? (updatedRow as unknown as Client) };
}

export async function archiveClient(
  clientId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeClient } = await supabase
    .from("clients")
    .select("id, name, is_own_farm, is_active")
    .eq("id", clientId)
    .single();

  if (!beforeClient) {
    return { success: false, error: "לקוח לא נמצא" };
  }

  if (beforeClient.is_own_farm) {
    return { success: false, error: "לא ניתן למחוק את לקוח המשק" };
  }

  if (!beforeClient.is_active) {
    return { success: false, error: "הלקוח כבר גונז" };
  }

  const { error } = await supabase
    .from("clients")
    .update({ is_active: false })
    .eq("id", clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "clients",
    recordId: clientId,
    action: "archive",
    before: beforeClient,
    after: { ...beforeClient, is_active: false },
  });

  revalidatePath("/admin/clients");
  return { success: true, data: { id: clientId } };
}

export async function addClientAlias(
  clientId: string,
  alias: string,
): Promise<ActionResult<ClientAlias>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = clientAliasSchema.safeParse({ alias });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newAlias, error } = await supabase
    .from("client_aliases")
    .insert({ client_id: clientId, alias: parsed.data.alias })
    .select("id, client_id, alias")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "client_aliases",
    recordId: newAlias.id,
    action: "create",
    before: null,
    after: newAlias,
  });

  revalidatePath("/admin/clients");
  return { success: true, data: newAlias };
}

export async function removeClientAlias(
  aliasId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeAlias } = await supabase
    .from("client_aliases")
    .select("id, client_id, alias")
    .eq("id", aliasId)
    .single();

  if (!beforeAlias) {
    return { success: false, error: "כינוי לא נמצא" };
  }

  const { error } = await supabase
    .from("client_aliases")
    .delete()
    .eq("id", aliasId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "client_aliases",
    recordId: aliasId,
    action: "archive",
    before: beforeAlias,
    after: null,
  });

  revalidatePath("/admin/clients");
  return { success: true, data: { id: aliasId } };
}

export async function resolveClient(
  attendanceLogId: string,
  clientId: string,
  areaId?: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeLog } = await supabase
    .from("attendance_logs")
    .select("id, pending_client_name, area_id")
    .eq("id", attendanceLogId)
    .single();

  if (!beforeLog) {
    return { success: false, error: "רשומה לא נמצאה" };
  }

  const updatePayload: Record<string, unknown> = {
    pending_client_name: null,
  };
  if (areaId) {
    updatePayload.area_id = areaId;
  }

  const { error } = await supabase
    .from("attendance_logs")
    .update(updatePayload)
    .eq("id", attendanceLogId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "attendance_logs",
    recordId: attendanceLogId,
    action: "resolve",
    before: { pending_client_name: beforeLog.pending_client_name },
    after: { pending_client_name: null, resolved_client_id: clientId },
  });

  revalidatePath("/admin/review");
  return { success: true, data: { id: attendanceLogId } };
}
