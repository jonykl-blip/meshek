"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Profile {
  id: string;
  full_name: string;
  role: string;
  language_pref: string;
  telegram_id: string | null;
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
    .select("id, full_name, role, language_pref, telegram_id, is_active")
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
