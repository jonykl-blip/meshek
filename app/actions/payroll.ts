"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

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

export interface ExportResult {
  csvContent: string;
  filename: string;
}

interface RawAttendanceRow {
  profile_id: string | null;
  total_hours: number | null;
  profiles: unknown;
}

function aggregateWorkerData(
  data: RawAttendanceRow[]
): PayrollWorkerRow[] {
  const workerMap = new Map<
    string,
    {
      worker_name: string;
      total_hours: number;
      hourly_rate: number | null;
      record_count: number;
    }
  >();

  for (const row of data) {
    const profile = row.profiles as {
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

  return Array.from(workerMap.entries())
    .map(([profile_id, w]) => ({
      profile_id,
      worker_name: w.worker_name,
      total_hours: w.total_hours,
      hourly_rate: w.hourly_rate,
      gross_pay: w.hourly_rate != null ? w.total_hours * w.hourly_rate : null,
      record_count: w.record_count,
    }))
    .sort((a, b) => a.worker_name.localeCompare(b.worker_name, "he"));
}

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
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

  const rows = aggregateWorkerData((data ?? []) as RawAttendanceRow[]);
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

export async function exportPayrollCsv(params: {
  fromDate: string;
  toDate: string;
}): Promise<ActionResult<ExportResult>> {
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

  const rows = aggregateWorkerData((data ?? []) as RawAttendanceRow[]);

  const BOM = "\uFEFF";
  const metaRow = `תקופה:,${params.fromDate} - ${params.toDate}`;
  const header = [
    csvEscape("שם עובד"),
    csvEscape('סה"כ שעות'),
    csvEscape("תעריף לשעה"),
    csvEscape("שכר ברוטו"),
  ].join(",");
  const dataRows = rows.map((r) =>
    [
      csvEscape(r.worker_name),
      csvEscape(r.total_hours.toFixed(1)),
      csvEscape(r.hourly_rate !== null ? r.hourly_rate.toFixed(2) : null),
      csvEscape(r.gross_pay !== null ? r.gross_pay.toFixed(2) : null),
    ].join(",")
  );
  const csvContent = BOM + [metaRow, header, ...dataRows].join("\r\n");
  const filename = `payroll-${params.fromDate}-to-${params.toDate}.csv`;

  await logAudit({
    actorId: user.id,
    tableName: "payroll_export",
    recordId: crypto.randomUUID(),
    action: "create",
    before: null,
    after: {
      from: params.fromDate,
      to: params.toDate,
      worker_count: rows.length,
      total_hours: rows.reduce((s, r) => s + r.total_hours, 0),
      total_gross_pay: rows.reduce((s, r) => s + (r.gross_pay ?? 0), 0),
    },
  });

  return { success: true, data: { csvContent, filename } };
}
