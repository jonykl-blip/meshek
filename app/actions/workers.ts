"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { workerProfileSchema } from "@/lib/validators/worker-profile";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Profile {
  id: string;
  full_name: string;
  role: string;
  language_pref: string;
  telegram_id: string | null;
  hourly_rate: number | null;
  is_active: boolean;
}

export async function bindTelegramId(
  profileId: string,
  telegramId: string,
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();

  // Verify the caller is authenticated and has admin/owner role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "לא מאומת" };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
    return { success: false, error: "אין הרשאה" };
  }

  // Validate telegram_id — allow empty to unbind, otherwise must be numeric
  const trimmedId = telegramId.trim();
  if (trimmedId && !/^\d+$/.test(trimmedId)) {
    return { success: false, error: "מזהה טלגרם חייב להיות מספרי" };
  }

  // Check uniqueness: no other profile should have this telegram_id (skip if clearing)
  if (trimmedId) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("telegram_id", trimmedId)
      .neq("id", profileId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `מזהה טלגרם כבר משויך ל-${existing.full_name}`,
      };
    }
  }

  // Get before state for audit
  const { data: beforeProfile } = await supabase
    .from("profiles")
    .select("id, full_name, telegram_id")
    .eq("id", profileId)
    .single();

  if (!beforeProfile) {
    return { success: false, error: "פרופיל לא נמצא" };
  }

  // Update telegram_id (null if clearing)
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ telegram_id: trimmedId || null })
    .eq("id", profileId)
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  await logAudit({
    actorId: user.id,
    tableName: "profiles",
    recordId: profileId,
    action: "assign",
    before: { telegram_id: beforeProfile.telegram_id },
    after: { telegram_id: trimmedId || null },
  });

  return { success: true, data: updated };
}

async function verifyAdminCaller(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: "לא מאומת" } as const;
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
    return { user: null, error: "אין הרשאה" } as const;
  }

  return { user, error: null } as const;
}

export async function createWorkerProfile(
  input: {
    full_name: string;
    telegram_id?: string;
    hourly_rate: number;
    language_pref: string;
    role: string;
  },
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = workerProfileSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError.message };
  }

  const { full_name, telegram_id, hourly_rate, language_pref, role } = parsed.data;

  // Check telegram_id uniqueness if provided
  if (telegram_id) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `מזהה טלגרם כבר משויך ל-${existing.full_name}`,
      };
    }
  }

  // Create headless auth user (required because profiles.id FK → auth.users)
  const adminClient = createAdminClient();
  const placeholderEmail = `worker-${crypto.randomUUID()}@meshek.local`;
  const { data: authData, error: authCreateError } =
    await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
    });

  if (authCreateError || !authData.user) {
    return { success: false, error: authCreateError?.message ?? "יצירת משתמש נכשלה" };
  }

  const newUserId = authData.user.id;

  // Insert profile using the admin client (bypasses RLS — needed because
  // the caller's RLS policies don't allow INSERT on profiles)
  const { data: newProfile, error: insertError } = await adminClient
    .from("profiles")
    .insert({
      id: newUserId,
      full_name,
      telegram_id: telegram_id || null,
      hourly_rate,
      language_pref,
      role,
    })
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "profiles",
    recordId: newUserId,
    action: "create",
    before: null,
    after: newProfile,
  });

  revalidatePath("/admin/workers");
  return { success: true, data: newProfile };
}

export async function updateWorkerProfile(
  profileId: string,
  input: {
    full_name?: string;
    telegram_id?: string;
    hourly_rate?: number;
    language_pref?: string;
    role?: string;
  },
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = workerProfileSchema.partial().safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError.message };
  }

  const adminClient = createAdminClient();

  // Fetch before state
  const { data: beforeProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .eq("id", profileId)
    .single();

  if (!beforeProfile) {
    return { success: false, error: "פרופיל לא נמצא" };
  }

  // Check telegram_id uniqueness if changing
  const newTelegramId = parsed.data.telegram_id;
  if (newTelegramId && newTelegramId !== beforeProfile.telegram_id) {
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("telegram_id", newTelegramId)
      .neq("id", profileId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `מזהה טלגרם כבר משויך ל-${existing.full_name}`,
      };
    }
  }

  // Build update payload — only changed fields
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updateData[key] = key === "telegram_id" && value === "" ? null : value;
    }
  }

  const { data: updated, error } = await adminClient
    .from("profiles")
    .update(updateData)
    .eq("id", profileId)
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "profiles",
    recordId: profileId,
    action: "edit",
    before: beforeProfile,
    after: updated,
  });

  revalidatePath("/admin/workers");
  return { success: true, data: updated };
}

export async function archiveWorkerProfile(
  profileId: string,
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const adminClient = createAdminClient();

  // Fetch before state
  const { data: beforeProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .eq("id", profileId)
    .single();

  if (!beforeProfile) {
    return { success: false, error: "פרופיל לא נמצא" };
  }

  const { data: updated, error } = await adminClient
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "profiles",
    recordId: profileId,
    action: "archive",
    before: { is_active: true },
    after: { is_active: false },
  });

  revalidatePath("/admin/workers");
  return { success: true, data: updated };
}
