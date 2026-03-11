import type { createClient } from "@/lib/supabase/server";

const EXCESSIVE_HOURS_THRESHOLD = 12;
const PENDING_STALE_HOURS = 24;

export async function getSidebarKpis(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{
  pendingCount: number;
  approvedToday: number;
  anomalyCount: number;
}> {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });

  const staleThreshold = new Date(
    Date.now() - PENDING_STALE_HOURS * 60 * 60 * 1000
  ).toISOString();

  const [pendingResult, approvedResult, excessiveResult, staleResult] =
    await Promise.all([
      supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("work_date", today)
        .eq("status", "approved"),
      supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .in("status", ["approved", "imported"])
        .gt("total_hours", EXCESSIVE_HOURS_THRESHOLD)
        .eq("work_date", today),
      supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", staleThreshold),
    ]);

  return {
    pendingCount: pendingResult.count ?? 0,
    approvedToday: approvedResult.count ?? 0,
    anomalyCount: (excessiveResult.count ?? 0) + (staleResult.count ?? 0),
  };
}
