"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";

interface AttendanceHealthMetrics {
  totalRecords: number;
  pendingCount: number;
  unmatchedRate: number;
}

interface StaleListStatus {
  workersLastUpdated: string | null;
  areasLastUpdated: string | null;
  isStale: boolean;
}

export async function getAttendanceHealthMetrics(): Promise<
  ActionResult<AttendanceHealthMetrics>
> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { count: totalRecords, error: totalError } = await supabase
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .gte("work_date", startDate);

  if (totalError) return { success: false, error: totalError.message };

  const { count: pendingCount, error: pendingError } = await supabase
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .gte("work_date", startDate)
    .eq("status", "pending");

  if (pendingError) return { success: false, error: pendingError.message };

  const total = totalRecords ?? 0;
  const pending = pendingCount ?? 0;
  const unmatchedRate = total === 0 ? 0 : (pending / total) * 100;

  return {
    success: true,
    data: { totalRecords: total, pendingCount: pending, unmatchedRate },
  };
}

export async function getStaleListStatus(): Promise<
  ActionResult<StaleListStatus>
> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const { data: latestProfile, error: profileError } = await supabase
    .from("profiles")
    .select("updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) return { success: false, error: profileError.message };

  const { data: latestArea, error: areaError } = await supabase
    .from("areas")
    .select("updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (areaError) return { success: false, error: areaError.message };

  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const workersLastUpdated = latestProfile?.updated_at ?? null;
  const areasLastUpdated = latestArea?.updated_at ?? null;

  const workersStale =
    !workersLastUpdated ||
    now.getTime() - new Date(workersLastUpdated).getTime() > thirtyDaysMs;
  const areasStale =
    !areasLastUpdated ||
    now.getTime() - new Date(areasLastUpdated).getTime() > thirtyDaysMs;

  return {
    success: true,
    data: {
      workersLastUpdated,
      areasLastUpdated,
      isStale: workersStale || areasStale,
    },
  };
}
