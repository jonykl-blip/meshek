"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { verifyAdminCaller, verifyDashboardCaller, type ActionResult } from "@/lib/auth-helpers";
import { workerProfileSchema } from "@/lib/validators/worker-profile";
import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import crypto from "crypto";

function revalidateAdminReview() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/admin/review`);
  }
}

function revalidateAdminWorkers() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/admin/workers`);
  }
}

function revalidateDashboard() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
  }
}

export interface PendingRecord {
  id: string;
  profile_id: string | null;
  area_id: string | null;
  work_date: string;
  total_hours: number | null;
  voice_signed_url: string | null;
  raw_transcript: string | null;
  status: string;
  created_at: string;
  worker_name: string | null;
  area_name: string | null;
}

function extractVoiceStoragePath(voiceRefUrl: string): string | null {
  if (!voiceRefUrl.startsWith("http")) {
    return voiceRefUrl;
  }
  try {
    const url = new URL(voiceRefUrl);
    const match = url.pathname.match(/\/voice-recordings\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function getPendingRecords(): Promise<
  ActionResult<PendingRecord[]>
> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data, error } = await supabase
    .from("attendance_logs")
    .select(
      `
      id,
      profile_id,
      area_id,
      work_date,
      total_hours,
      voice_ref_url,
      raw_transcript,
      status,
      created_at,
      profiles!attendance_logs_profile_id_fkey ( full_name ),
      areas!attendance_logs_area_id_fkey ( name )
    `
    )
    .eq("status", "pending")
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const records: PendingRecord[] = await Promise.all(
    (data ?? []).map(async (row) => {
      let voiceSignedUrl: string | null = null;

      if (row.voice_ref_url) {
        const storagePath = extractVoiceStoragePath(row.voice_ref_url);
        if (storagePath) {
          voiceSignedUrl = `/api/audio/${storagePath}`;
        }
      }

      // Supabase FK joins return object for to-one relations, but TS infers array
      const profile = row.profiles as unknown as { full_name: string } | null;
      const area = row.areas as unknown as { name: string } | null;

      return {
        id: row.id,
        profile_id: row.profile_id,
        area_id: row.area_id,
        work_date: row.work_date,
        total_hours: row.total_hours,
        voice_signed_url: voiceSignedUrl,
        raw_transcript: row.raw_transcript,
        status: row.status,
        created_at: row.created_at,
        worker_name: profile?.full_name ?? null,
        area_name: area?.name ?? null,
      };
    })
  );

  return { success: true, data: records };
}

export async function getReviewRecords(
  showAll: boolean
): Promise<ActionResult<PendingRecord[]>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  let query = supabase
    .from("attendance_logs")
    .select(
      `
      id,
      profile_id,
      area_id,
      work_date,
      total_hours,
      voice_ref_url,
      raw_transcript,
      status,
      created_at,
      profiles!attendance_logs_profile_id_fkey ( full_name ),
      areas!attendance_logs_area_id_fkey ( name )
    `
    )
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!showAll) {
    query = query.eq("status", "pending").limit(500);
  } else {
    query = query.limit(200);
  }

  const { data, error } = await query;

  if (error) return { success: false, error: error.message };

  const records: PendingRecord[] = (data ?? []).map((row) => {
    let voiceSignedUrl: string | null = null;

    if (row.voice_ref_url) {
      const storagePath = extractVoiceStoragePath(row.voice_ref_url);
      if (storagePath) {
        voiceSignedUrl = `/api/audio/${storagePath}`;
      }
    }

    const profile = row.profiles as unknown as { full_name: string } | null;
    const area = row.areas as unknown as { name: string } | null;

    return {
      id: row.id,
      profile_id: row.profile_id,
      area_id: row.area_id,
      work_date: row.work_date,
      total_hours: row.total_hours,
      voice_signed_url: voiceSignedUrl,
      raw_transcript: row.raw_transcript,
      status: row.status,
      created_at: row.created_at,
      worker_name: profile?.full_name ?? null,
      area_name: area?.name ?? null,
    };
  });

  return { success: true, data: records };
}

export async function resolveWorker(
  recordId: string,
  profileId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };
  if (before.profile_id !== null) return { success: false, error: "שם העובד כבר מוגדר לרשומה זו" };

  const { error } = await supabase
    .from("attendance_logs")
    .update({ profile_id: profileId })
    .eq("id", recordId);

  if (error) {
    const msg = error.code === "23503" ? "עובד לא נמצא במערכת" : error.message;
    return { success: false, error: msg };
  }

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "resolve",
      before: { profile_id: before.profile_id },
      after: { profile_id: profileId },
    });
  } catch (auditErr) {
    console.error("[resolveWorker] Audit log failed:", auditErr);
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateAdminReview();
  return { success: true, data: { id: recordId } };
}

export async function resolveArea(
  recordId: string,
  areaId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };
  if (before.area_id !== null) return { success: false, error: "השטח כבר מוגדר לרשומה זו" };

  const { error } = await supabase
    .from("attendance_logs")
    .update({ area_id: areaId })
    .eq("id", recordId);

  if (error) {
    const msg = error.code === "23503" ? "שטח לא נמצא במערכת" : error.message;
    return { success: false, error: msg };
  }

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "resolve",
      before: { area_id: before.area_id },
      after: { area_id: areaId },
    });
  } catch (auditErr) {
    console.error("[resolveArea] Audit log failed:", auditErr);
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateAdminReview();
  return { success: true, data: { id: recordId } };
}

export async function getActiveWorkers(): Promise<
  ActionResult<{ id: string; full_name: string }[]>
> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .eq("role", "worker")
    .order("full_name");

  if (error) return { success: false, error: error.message };

  return { success: true, data: data ?? [] };
}

export async function getActiveAreas(): Promise<
  ActionResult<{ id: string; name: string }[]>
> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data, error } = await supabase
    .from("areas")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) return { success: false, error: error.message };

  return { success: true, data: data ?? [] };
}

export async function createWorkerAndResolve(
  recordId: string,
  workerInput: {
    full_name: string;
    hourly_rate?: number;
    language_pref: string;
  }
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const parsed = workerProfileSchema.safeParse({
    ...workerInput,
    role: "worker",
  });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError.message };
  }

  // Verify attendance record exists
  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };

  // Create headless auth user
  const adminClient = createAdminClient();
  const placeholderEmail = `worker-${crypto.randomUUID()}@meshek.local`;
  const { data: authData, error: authCreateError } =
    await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
    });

  if (authCreateError || !authData.user) {
    return {
      success: false,
      error: authCreateError?.message ?? "יצירת משתמש נכשלה",
    };
  }

  const newUserId = authData.user.id;

  // Insert profile via admin client (RLS blocks cross-user INSERT)
  const { data: newProfile, error: insertError } = await adminClient
    .from("profiles")
    .insert({
      id: newUserId,
      full_name: parsed.data.full_name,
      hourly_rate: parsed.data.hourly_rate ?? null,
      language_pref: parsed.data.language_pref,
      role: "worker",
    })
    .select("id, full_name, role, language_pref, hourly_rate, is_active")
    .single();

  if (insertError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    return { success: false, error: insertError.message };
  }

  // Audit: profile creation
  try {
    await logAudit({
      actorId: user.id,
      tableName: "profiles",
      recordId: newUserId,
      action: "create",
      before: null,
      after: newProfile,
    });
  } catch (auditErr) {
    console.error("[createWorkerAndResolve] Profile audit log failed:", auditErr);
  }

  // Resolve attendance record
  const { error: resolveError } = await supabase
    .from("attendance_logs")
    .update({ profile_id: newUserId })
    .eq("id", recordId);

  if (resolveError) {
    return { success: false, error: resolveError.message };
  }

  // Audit: attendance resolution
  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "resolve",
      before: { profile_id: before.profile_id },
      after: { profile_id: newUserId },
    });
  } catch (auditErr) {
    console.error("[createWorkerAndResolve] Resolve audit log failed:", auditErr);
    revalidateAdminReview();
    revalidateAdminWorkers();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateAdminReview();
  revalidateAdminWorkers();
  return { success: true, data: { id: recordId } };
}

export async function approveRecord(
  recordId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status, total_hours")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };

  if (before.profile_id === null || before.area_id === null) {
    return {
      success: false,
      error: "לא ניתן לאשר רשומה עם עובד או שטח לא מזוהה",
    };
  }

  const { error } = await supabase
    .from("attendance_logs")
    .update({ status: "approved" })
    .eq("id", recordId);

  if (error) return { success: false, error: error.message };

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "approve",
      before: { status: before.status },
      after: { status: "approved" },
    });
  } catch (auditErr) {
    console.error("[approveRecord] Audit log failed:", auditErr);
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateAdminReview();
  return { success: true, data: { id: recordId } };
}

export async function rejectRecord(
  recordId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status, total_hours")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };

  const { error } = await supabase
    .from("attendance_logs")
    .update({ status: "rejected" })
    .eq("id", recordId);

  if (error) return { success: false, error: error.message };

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "reject",
      before: { status: before.status },
      after: { status: "rejected" },
    });
  } catch (auditErr) {
    console.error("[rejectRecord] Audit log failed:", auditErr);
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateAdminReview();
  return { success: true, data: { id: recordId } };
}

export async function dashboardApproveRecord(
  recordId: string
): Promise<ActionResult<{ id: string; status: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };

  if (before.status !== "pending") {
    return { success: false, error: "ניתן לאשר רק רשומות ממתינות" };
  }

  if (before.profile_id === null || before.area_id === null) {
    return {
      success: false,
      error: "לא ניתן לאשר רשומה עם עובד או שטח לא מזוהה",
    };
  }

  const { error } = await supabase
    .from("attendance_logs")
    .update({ status: "approved" })
    .eq("id", recordId);

  if (error) return { success: false, error: error.message };

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "approve",
      before: { status: before.status },
      after: { status: "approved" },
    });
  } catch (auditErr) {
    console.error("[dashboardApproveRecord] Audit log failed:", auditErr);
    revalidateDashboard();
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateDashboard();
  revalidateAdminReview();
  return { success: true, data: { id: recordId, status: "approved" } };
}

export async function dashboardRejectRecord(
  recordId: string
): Promise<ActionResult<{ id: string; status: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, profile_id, area_id, status")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };

  if (before.status !== "pending") {
    return { success: false, error: "ניתן לדחות רק רשומות ממתינות" };
  }

  if (before.profile_id === null || before.area_id === null) {
    return {
      success: false,
      error: "לא ניתן לדחות רשומה עם עובד או שטח לא מזוהה",
    };
  }

  const { error } = await supabase
    .from("attendance_logs")
    .update({ status: "rejected" })
    .eq("id", recordId);

  if (error) return { success: false, error: error.message };

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "reject",
      before: { status: before.status },
      after: { status: "rejected" },
    });
  } catch (auditErr) {
    console.error("[dashboardRejectRecord] Audit log failed:", auditErr);
    revalidateDashboard();
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateDashboard();
  revalidateAdminReview();
  return { success: true, data: { id: recordId, status: "rejected" } };
}

export interface DailyAttendanceRecord {
  id: string;
  worker_name: string | null;
  area_name: string | null;
  work_date: string;
  total_hours: number;
  status: "approved" | "imported" | "pending" | "rejected";
  source: string;
  profile_id: string | null;
  area_id: string | null;
}

export async function getDailyAttendance(params?: {
  fromDate?: string;
  toDate?: string;
  workerId?: string;
  areaId?: string;
}): Promise<ActionResult<DailyAttendanceRecord[]>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const todayJerusalem = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  const fromDate = params?.fromDate ?? todayJerusalem;
  const toDate = params?.toDate ?? todayJerusalem;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
    return { success: false, error: "תאריך לא תקין" };
  }

  const daysDiff =
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000;
  if (daysDiff < 0) {
    return { success: false, error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום" };
  }
  if (daysDiff > 31) {
    return {
      success: false,
      error: "טווח תאריכים לא יכול לעלות על 31 יום",
    };
  }

  let query = supabase
    .from("attendance_logs")
    .select(
      "id, profile_id, area_id, work_date, total_hours, status, source, profiles(full_name), areas(name)"
    )
    .in("status", ["approved", "imported", "pending"]);

  if (fromDate === toDate) {
    query = query.eq("work_date", fromDate);
  } else {
    query = query.gte("work_date", fromDate).lte("work_date", toDate);
  }

  if (params?.workerId) {
    query = query.eq("profile_id", params.workerId);
  }
  if (params?.areaId) {
    query = query.eq("area_id", params.areaId);
  }

  const { data, error } = await query
    .order("work_date", { ascending: false })
    .order("full_name", { referencedTable: "profiles", ascending: true });

  if (error) return { success: false, error: error.message };

  const records: DailyAttendanceRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    worker_name:
      (row.profiles as unknown as { full_name: string } | null)?.full_name ??
      null,
    area_name:
      (row.areas as unknown as { name: string } | null)?.name ?? null,
    work_date: row.work_date,
    total_hours: row.total_hours,
    status: row.status as DailyAttendanceRecord["status"],
    source: row.source,
    profile_id: row.profile_id,
    area_id: row.area_id,
  }));

  return { success: true, data: records };
}

const EXCESSIVE_HOURS_THRESHOLD = 12;
const PENDING_STALE_HOURS = 24;

export interface AnomalyRecord {
  id: string;
  worker_name: string | null;
  area_name: string | null;
  work_date: string;
  total_hours: number | null;
}

export interface AnomalyResult {
  excessiveHours: AnomalyRecord[];
  stalePending: AnomalyRecord[];
}

export async function getAnomalies(params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<ActionResult<AnomalyResult>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const todayJerusalem = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  const fromDate = params?.fromDate ?? todayJerusalem;
  const toDate = params?.toDate ?? todayJerusalem;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
    return { success: false, error: "תאריך לא תקין" };
  }

  const daysDiff =
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000;
  if (daysDiff < 0) {
    return { success: false, error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום" };
  }

  // Excessive hours: date-range aware, approved/imported only, total_hours > 12
  let excessQuery = supabase
    .from("attendance_logs")
    .select("id, work_date, total_hours, profiles(full_name), areas(name)")
    .in("status", ["approved", "imported"])
    .gt("total_hours", EXCESSIVE_HOURS_THRESHOLD);

  if (fromDate === toDate) {
    excessQuery = excessQuery.eq("work_date", fromDate);
  } else {
    excessQuery = excessQuery.gte("work_date", fromDate).lte("work_date", toDate);
  }
  excessQuery = excessQuery.order("work_date", { ascending: false });

  // Stale pending: date-independent, all pending records older than 24h
  const staleThreshold = new Date(
    Date.now() - PENDING_STALE_HOURS * 60 * 60 * 1000
  ).toISOString();

  const staleQuery = supabase
    .from("attendance_logs")
    .select("id, work_date, total_hours, profiles(full_name), areas(name)")
    .eq("status", "pending")
    .lt("created_at", staleThreshold)
    .order("created_at", { ascending: true });

  const [excessResult, staleResult] = await Promise.all([excessQuery, staleQuery]);

  if (excessResult.error) return { success: false, error: excessResult.error.message };
  if (staleResult.error) return { success: false, error: staleResult.error.message };

  const toAnomalyRecord = (row: {
    id: string;
    work_date: string;
    total_hours: number | null;
    profiles: unknown;
    areas: unknown;
  }): AnomalyRecord => ({
    id: row.id,
    worker_name: (row.profiles as { full_name: string } | null)?.full_name ?? null,
    area_name: (row.areas as { name: string } | null)?.name ?? null,
    work_date: row.work_date,
    total_hours: row.total_hours,
  });

  return {
    success: true,
    data: {
      excessiveHours: (excessResult.data ?? []).map(toAnomalyRecord),
      stalePending: (staleResult.data ?? []).map(toAnomalyRecord),
    },
  };
}

export async function createManualAttendance(input: {
  profileId: string;
  workDate: string;
  areaId: string;
  totalHours: number;
}): Promise<
  ActionResult<{
    id: string;
    status: string;
    duplicate?: { id: string; total_hours: number };
  }>
> {
  const supabase = await createClient();
  const { user, role, error: authError } = await verifyDashboardCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { profileId, workDate, areaId, totalHours } = input;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(workDate)) {
    return { success: false, error: "תאריך לא תקין" };
  }

  // Validate not future date (Jerusalem TZ)
  const todayJerusalem = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  if (workDate > todayJerusalem) {
    return { success: false, error: "לא ניתן לבחור תאריך עתידי" };
  }

  // Validate hours
  if (totalHours < 0.5 || totalHours > 24) {
    return { success: false, error: "שעות חייבות להיות בין 0.5 ל-24" };
  }
  if (Math.round(totalHours * 2) !== totalHours * 2) {
    return { success: false, error: "שעות חייבות להיות בכפולות של 0.5" };
  }

  // Validate worker exists, is active, and has worker role
  const { data: workerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("is_active", true)
    .eq("role", "worker")
    .single();

  if (!workerProfile) {
    return { success: false, error: "עובד לא נמצא או לא פעיל" };
  }

  // Validate area exists and is active
  const { data: area } = await supabase
    .from("areas")
    .select("id")
    .eq("id", areaId)
    .eq("is_active", true)
    .single();

  if (!area) {
    return { success: false, error: "שטח לא נמצא או לא פעיל" };
  }

  // Duplicate check (warn, don't block)
  const { data: existingRecord } = await supabase
    .from("attendance_logs")
    .select("id, total_hours")
    .eq("profile_id", profileId)
    .eq("work_date", workDate)
    .eq("area_id", areaId)
    .limit(1)
    .maybeSingle();

  // Determine status based on caller role
  const status = role === "owner" || role === "admin" ? "approved" : "pending";

  // Insert record
  const { data: inserted, error: insertError } = await supabase
    .from("attendance_logs")
    .insert({
      profile_id: profileId,
      area_id: areaId,
      work_date: workDate,
      total_hours: totalHours,
      status,
      source: "manual",
    })
    .select("id")
    .single();

  if (insertError) {
    const msg =
      insertError.code === "23503"
        ? "עובד או שטח לא נמצאו במערכת"
        : insertError.message;
    return { success: false, error: msg };
  }

  // Audit log
  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId: inserted.id,
      action: "create",
      before: null,
      after: {
        profile_id: profileId,
        area_id: areaId,
        work_date: workDate,
        total_hours: totalHours,
        status,
        source: "manual",
      },
    });
  } catch (auditErr) {
    console.error("[createManualAttendance] Audit log failed:", auditErr);
    revalidateDashboard();
    return { success: false as const, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateDashboard();

  return {
    success: true,
    data: {
      id: inserted.id,
      status,
      ...(existingRecord
        ? {
            duplicate: {
              id: existingRecord.id,
              total_hours: existingRecord.total_hours,
            },
          }
        : {}),
    },
  };
}

export async function editRecord(
  recordId: string,
  updates: { total_hours?: number; area_id?: string }
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  if (updates.total_hours === undefined && updates.area_id === undefined) {
    return { success: false, error: "אין שדות לעדכון" };
  }

  if (
    updates.total_hours !== undefined &&
    (isNaN(updates.total_hours) || updates.total_hours < 0 || updates.total_hours > 24)
  ) {
    return { success: false, error: "שעות עבודה חייבות להיות בין 0 ל-24" };
  }

  const { data: before } = await supabase
    .from("attendance_logs")
    .select("id, total_hours, area_id, status")
    .eq("id", recordId)
    .single();

  if (!before) return { success: false, error: "רשומה לא נמצאה" };

  const updatePayload: Record<string, unknown> = {};
  const beforeDiff: Record<string, unknown> = {};
  const afterDiff: Record<string, unknown> = {};

  if (updates.total_hours !== undefined) {
    updatePayload.total_hours = updates.total_hours;
    beforeDiff.total_hours = before.total_hours;
    afterDiff.total_hours = updates.total_hours;
  }
  if (updates.area_id !== undefined) {
    updatePayload.area_id = updates.area_id;
    beforeDiff.area_id = before.area_id;
    afterDiff.area_id = updates.area_id;
  }

  const { error } = await supabase
    .from("attendance_logs")
    .update(updatePayload)
    .eq("id", recordId);

  if (error) {
    const msg = error.code === "23503" ? "שטח לא נמצא במערכת" : error.message;
    return { success: false, error: msg };
  }

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "edit",
      before: beforeDiff,
      after: afterDiff,
    });
  } catch (auditErr) {
    console.error("[editRecord] Audit log failed:", auditErr);
    revalidateAdminReview();
    return { success: false, error: "הפעולה בוצעה אך תיעוד הביקורת נכשל" };
  }

  revalidateAdminReview();
  return { success: true, data: { id: recordId } };
}
