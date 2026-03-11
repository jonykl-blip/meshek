"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";

export interface PayrollWorkerRow {
  profile_id: string;
  worker_name: string;
  total_hours: number;
  hourly_rate: number | null;
  gross_pay: number | null;
  record_count: number;
}

export interface PayrollSummary {
  rows: PayrollWorkerRow[];
  period: { from: string; to: string };
  total_hours: number;
  total_gross_pay: number;
  has_missing_rates: boolean;
}

export interface AnomalyRecord {
  id: string;
  worker_name: string;
  work_date: string; // YYYY-MM-DD
  area_name: string;
  total_hours: number;
}

export async function getPayrollAnomalies(params: {
  fromDate: string;
  toDate: string;
}): Promise<ActionResult<AnomalyRecord[]>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(params.fromDate) || !dateRegex.test(params.toDate)) {
    return { success: false, error: "תאריך לא תקין" };
  }

  if (params.fromDate > params.toDate) {
    return {
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    };
  }

  const { data, error } = await supabase
    .from("attendance_logs")
    .select("id, total_hours, work_date, profiles(full_name), areas(name)")
    .eq("status", "approved")
    .gt("total_hours", 12)
    .gte("work_date", params.fromDate)
    .lte("work_date", params.toDate)
    .not("profile_id", "is", null)
    .order("work_date", { ascending: true });

  if (error) return { success: false, error: error.message };

  const records: AnomalyRecord[] = (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name: string } | null;
    const area = row.areas as unknown as { name: string } | null;
    return {
      id: row.id,
      worker_name: profile?.full_name ?? "לא ידוע",
      work_date: row.work_date,
      area_name: area?.name ?? "לא ידוע",
      total_hours: row.total_hours ?? 0,
    };
  });

  return { success: true, data: records };
}

export async function getPayrollAggregation(params: {
  fromDate: string;
  toDate: string;
}): Promise<ActionResult<PayrollSummary>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(params.fromDate) || !dateRegex.test(params.toDate)) {
    return { success: false, error: "תאריך לא תקין" };
  }

  if (params.fromDate > params.toDate) {
    return {
      success: false,
      error: "תאריך התחלה לא יכול להיות אחרי תאריך הסיום",
    };
  }

  const { data, error } = await supabase
    .from("attendance_logs")
    .select("profile_id, total_hours, profiles(full_name, hourly_rate)")
    .eq("status", "approved")
    .gte("work_date", params.fromDate)
    .lte("work_date", params.toDate)
    .not("profile_id", "is", null);

  if (error) return { success: false, error: error.message };

  const workerMap = new Map<
    string,
    {
      worker_name: string;
      total_hours: number;
      hourly_rate: number | null;
      record_count: number;
    }
  >();

  for (const row of data ?? []) {
    const profile = row.profiles as unknown as {
      full_name: string;
      hourly_rate: number | null;
    } | null;
    const pid = row.profile_id!;
    const existing = workerMap.get(pid);

    if (existing) {
      existing.total_hours += row.total_hours ?? 0;
      existing.record_count += 1;
    } else {
      workerMap.set(pid, {
        worker_name: profile?.full_name ?? "לא ידוע",
        total_hours: row.total_hours ?? 0,
        hourly_rate: profile?.hourly_rate ?? null,
        record_count: 1,
      });
    }
  }

  const rows: PayrollWorkerRow[] = Array.from(workerMap.entries())
    .map(([profile_id, w]) => ({
      profile_id,
      worker_name: w.worker_name,
      total_hours: w.total_hours,
      hourly_rate: w.hourly_rate,
      gross_pay: w.hourly_rate != null ? w.total_hours * w.hourly_rate : null,
      record_count: w.record_count,
    }))
    .sort((a, b) => a.worker_name.localeCompare(b.worker_name, "he"));

  const total_hours = rows.reduce((sum, r) => sum + r.total_hours, 0);
  const total_gross_pay = rows.reduce((sum, r) => sum + (r.gross_pay ?? 0), 0);
  const has_missing_rates = rows.some((r) => r.hourly_rate == null);

  return {
    success: true,
    data: {
      rows,
      period: { from: params.fromDate, to: params.toDate },
      total_hours,
      total_gross_pay,
      has_missing_rates,
    },
  };
}
