"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { workerProfileSchema, profileAliasSchema } from "@/lib/validators/worker-profile";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  language_pref: string;
  telegram_id: string | null;
  hourly_rate: number | null;
  is_active: boolean;
}

interface ProfileAlias {
  id: string;
  profile_id: string;
  alias: string;
}

export async function bindTelegramId(
  profileId: string,
  telegramId: string,
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

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
      .eq("is_active", true)
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
  const adminClient = createAdminClient();
  const { data: updated, error } = await adminClient
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


export async function createWorkerProfile(
  input: {
    full_name: string;
    email?: string;
    telegram_id?: string;
    hourly_rate?: number;
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

  const { full_name, email, telegram_id, hourly_rate, language_pref, role } = parsed.data;

  // Check telegram_id uniqueness if provided
  if (telegram_id) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("telegram_id", telegram_id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `מזהה טלגרם כבר משויך ל-${existing.full_name}`,
      };
    }
  }

  // Create auth user — staff roles get a real invite, workers get headless auth
  const adminClient = createAdminClient();
  const isStaffRole = role === "admin" || role === "manager";

  let authData;
  let authCreateError;

  if (isStaffRole && email) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    const result = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      ...(siteUrl ? { redirectTo: `${siteUrl}/auth/callback` } : {}),
    });
    authData = result.data;
    authCreateError = result.error;
  } else {
    const placeholderEmail = `worker-${crypto.randomUUID()}@meshek.local`;
    const result = await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
    });
    authData = result.data;
    authCreateError = result.error;
  }

  if (authCreateError || !authData.user) {
    const msg = authCreateError?.message ?? "יצירת משתמש נכשלה";
    // Friendly message for duplicate email
    if (msg.includes("already been registered") || msg.includes("already exists")) {
      return { success: false, error: "כתובת אימייל כבר קיימת במערכת" };
    }
    return { success: false, error: msg };
  }

  const newUserId = authData.user.id;

  // Insert profile via admin client (RLS doesn't allow cross-user INSERT)
  const { data: newProfile, error: insertError } = await adminClient
    .from("profiles")
    .insert({
      id: newUserId,
      full_name,
      telegram_id: telegram_id || null,
      hourly_rate: hourly_rate ?? null,
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

  // Fetch before state via admin client (RLS doesn't allow cross-user SELECT on all fields)
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
      .eq("is_active", true)
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

  // Fetch before state via admin client (RLS doesn't allow cross-user SELECT on all fields)
  const { data: beforeProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active")
    .eq("id", profileId)
    .single();

  if (!beforeProfile) {
    return { success: false, error: "פרופיל לא נמצא" };
  }

  if (!beforeProfile.is_active) {
    return { success: false, error: "העובד כבר גונז" };
  }

  const { data: updated, error } = await adminClient
    .from("profiles")
    .update({ is_active: false, telegram_id: null, updated_at: new Date().toISOString() })
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
    before: beforeProfile,
    after: updated,
  });

  revalidatePath("/admin/workers");
  return { success: true, data: updated };
}

export async function addProfileAlias(
  profileId: string,
  alias: string,
): Promise<ActionResult<ProfileAlias>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = profileAliasSchema.safeParse({ alias });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: newAlias, error } = await supabase
    .from("profile_aliases")
    .insert({ profile_id: profileId, alias: parsed.data.alias })
    .select("id, profile_id, alias")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "profile_aliases",
    recordId: newAlias.id,
    action: "create",
    before: null,
    after: newAlias,
  });

  revalidatePath("/admin/workers");
  return { success: true, data: newAlias };
}

export async function removeProfileAlias(
  aliasId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: beforeAlias } = await supabase
    .from("profile_aliases")
    .select("id, profile_id, alias")
    .eq("id", aliasId)
    .single();

  if (!beforeAlias) {
    return { success: false, error: "כינוי לא נמצא" };
  }

  const { error } = await supabase
    .from("profile_aliases")
    .delete()
    .eq("id", aliasId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    actorId: user.id,
    tableName: "profile_aliases",
    recordId: aliasId,
    action: "archive",
    before: beforeAlias,
    after: null,
  });

  revalidatePath("/admin/workers");
  return { success: true, data: { id: aliasId } };
}
