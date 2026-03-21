"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

export interface ContractorSessionRow {
  date: string;
  client_name: string;
  area_name: string;
  dunam_covered: number | null;
  work_type: string | null;
  materials: string;
  workers: string;
  worker_count: number;
  total_hours: number;
  raw_transcript: string | null;
}

export interface ContractorSummary {
  rows: ContractorSessionRow[];
  period: { from: string; to: string };
  total_hours: number;
  total_dunam: number;
  session_count: number;
}

export interface ContractorDashboardStats {
  total_hours: number;
  total_dunam: number;
  session_count: number;
  active_clients: number;
  by_client: { client_name: string; hours: number; dunam: number; sessions: number }[];
  by_work_type: { work_type: string; count: number }[];
}

export interface ExportResult {
  csvContent: string;
  filename: string;
}

interface RawContractorRow {
  id: string;
  work_date: string;
  total_hours: number | null;
  dunam_covered: number | null;
  raw_transcript: string | null;
  profiles: { full_name: string } | null;
  areas: {
    name: string;
    client_id: string;
    clients: { name: string } | null;
  } | null;
  work_types: { name_he: string } | null;
}

function validateDateRange(fromDate: string, toDate: string): string | null {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
    return "תאריך לא תקין";
  }
  if (fromDate > toDate) {
    return "תאריך התחלה לא יכול להיות אחרי תאריך הסיום";
  }
  return null;
}

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDateDDMMYYYY(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

type SessionKey = string;

function buildSessionKey(row: RawContractorRow): SessionKey {
  const areaId = row.areas?.client_id ?? "unknown";
  const areaName = row.areas?.name ?? "unknown";
  const workType = row.work_types?.name_he ?? "unknown";
  return `${row.work_date}|${areaId}|${areaName}|${workType}`;
}

interface SessionAccumulator {
  date: string;
  client_name: string;
  area_name: string;
  work_type: string | null;
  dunam_covered: number | null;
  workers: Set<string>;
  total_hours: number;
  raw_transcript: string | null;
  attendance_log_ids: string[];
}

function aggregateToSessions(
  data: RawContractorRow[],
): ContractorSessionRow[] {
  const sessionMap = new Map<SessionKey, SessionAccumulator>();

  for (const row of data) {
    const key = buildSessionKey(row);
    const existing = sessionMap.get(key);
    const workerName = (row.profiles as { full_name: string } | null)?.full_name ?? "לא ידוע";

    if (existing) {
      existing.workers.add(workerName);
      existing.total_hours += row.total_hours ?? 0;
      existing.attendance_log_ids.push(row.id);
      // Use the first non-null dunam value (same across workers in a session)
      if (existing.dunam_covered === null && row.dunam_covered !== null) {
        existing.dunam_covered = row.dunam_covered;
      }
    } else {
      sessionMap.set(key, {
        date: row.work_date,
        client_name: row.areas?.clients?.name ?? "לא ידוע",
        area_name: row.areas?.name ?? "לא ידוע",
        work_type: row.work_types?.name_he ?? null,
        dunam_covered: row.dunam_covered,
        workers: new Set([workerName]),
        total_hours: row.total_hours ?? 0,
        raw_transcript: row.raw_transcript,
        attendance_log_ids: [row.id],
      });
    }
  }

  return Array.from(sessionMap.values())
    .map((s) => ({
      date: s.date,
      client_name: s.client_name,
      area_name: s.area_name,
      dunam_covered: s.dunam_covered,
      work_type: s.work_type,
      materials: "", // Populated separately
      workers: Array.from(s.workers).join("; "),
      worker_count: s.workers.size,
      total_hours: s.total_hours,
      raw_transcript: s.raw_transcript,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.client_name.localeCompare(b.client_name, "he"));
}

async function fetchContractorData(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  params: { fromDate: string; toDate: string; clientId?: string },
): Promise<RawContractorRow[]> {
  let query = supabase
    .from("attendance_logs")
    .select(
      "id, work_date, total_hours, dunam_covered, raw_transcript, profiles(full_name), areas!inner(name, client_id, clients!inner(name)), work_types(name_he)",
    )
    .eq("status", "approved")
    .gte("work_date", params.fromDate)
    .lte("work_date", params.toDate)
    .neq("areas.clients.is_own_farm", true);

  if (params.clientId) {
    query = query.eq("areas.client_id", params.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RawContractorRow[];
}

async function fetchMaterialsForLogs(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  logIds: string[],
): Promise<Map<string, string>> {
  if (logIds.length === 0) return new Map();

  const { data } = await supabase
    .from("work_log_materials")
    .select("attendance_log_id, quantity, unit, materials(name_he)")
    .in("attendance_log_id", logIds);

  const materialsByLog = new Map<string, string[]>();
  for (const row of data ?? []) {
    const mat = row.materials as unknown as { name_he: string } | null;
    if (!mat) continue;

    const label = row.quantity
      ? `${mat.name_he} ${row.quantity}${row.unit ?? ""}`
      : mat.name_he;

    const existing = materialsByLog.get(row.attendance_log_id) ?? [];
    existing.push(label);
    materialsByLog.set(row.attendance_log_id, existing);
  }

  // Deduplicate materials per log
  const result = new Map<string, string>();
  for (const [logId, mats] of materialsByLog) {
    result.set(logId, [...new Set(mats)].join("; "));
  }
  return result;
}

export async function getContractorInvoiceSummary(params: {
  fromDate: string;
  toDate: string;
  clientId?: string;
}): Promise<ActionResult<ContractorSummary>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const dateError = validateDateRange(params.fromDate, params.toDate);
  if (dateError) return { success: false, error: dateError };

  try {
    const rawData = await fetchContractorData(supabase, params);
    const rows = aggregateToSessions(rawData);

    // Fetch materials for all attendance_log_ids
    const allLogIds = rawData.map((r) => r.id);
    const materialsMap = await fetchMaterialsForLogs(supabase, allLogIds);

    // Merge materials into session rows by matching dates/areas
    // Since materials are per-log, collect unique materials per session
    const sessionMaterials = new Map<number, Set<string>>();
    for (const raw of rawData) {
      const matStr = materialsMap.get(raw.id);
      if (!matStr) continue;

      // Find matching session row index
      const matchIdx = rows.findIndex(
        (r) =>
          r.date === raw.work_date &&
          r.area_name === (raw.areas?.name ?? "לא ידוע") &&
          r.work_type === (raw.work_types?.name_he ?? null),
      );
      if (matchIdx >= 0) {
        const existing = sessionMaterials.get(matchIdx) ?? new Set();
        for (const m of matStr.split("; ")) existing.add(m);
        sessionMaterials.set(matchIdx, existing);
      }
    }

    for (const [idx, mats] of sessionMaterials) {
      rows[idx].materials = [...mats].join("; ");
    }

    const total_hours = rows.reduce((sum, r) => sum + r.total_hours, 0);
    const total_dunam = rows.reduce((sum, r) => sum + (r.dunam_covered ?? 0), 0);

    return {
      success: true,
      data: {
        rows,
        period: { from: params.fromDate, to: params.toDate },
        total_hours,
        total_dunam,
        session_count: rows.length,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function exportContractorCsv(params: {
  fromDate: string;
  toDate: string;
  clientId?: string;
}): Promise<ActionResult<ExportResult>> {
  const result = await getContractorInvoiceSummary(params);
  if (!result.success) return result;

  const { rows } = result.data;

  const BOM = "\uFEFF";
  const hebrewHeaders = [
    "תאריך",
    "לקוח / גורם מזמין",
    "שם שדה / חלקה",
    "שטח בעבודה (דונם)",
    "סוג עבודה",
    "חומרים שבשימוש",
    "עובדים",
    "מספר עובדים",
    'סה"כ שעות (מצטבר)',
    "הערות",
  ].map(csvEscape).join(",");

  const englishHeaders = [
    "(Date)",
    "(Client)",
    "(Field Name)",
    "(Area Worked - Dunam)",
    "(Work Type)",
    "(Materials Used)",
    "(Workers)",
    "(Worker Count)",
    "(Total Hours)",
    "(Notes)",
  ].map(csvEscape).join(",");

  const dataRows = rows.map((r) =>
    [
      csvEscape(formatDateDDMMYYYY(r.date)),
      csvEscape(r.client_name),
      csvEscape(r.area_name),
      csvEscape(r.dunam_covered),
      csvEscape(r.work_type),
      csvEscape(r.materials),
      csvEscape(r.workers),
      csvEscape(r.worker_count),
      csvEscape(r.total_hours.toFixed(1)),
      csvEscape(r.raw_transcript),
    ].join(","),
  );

  const csvContent = BOM + [hebrewHeaders, englishHeaders, ...dataRows].join("\r\n");

  // Build filename
  const monthStr = params.fromDate.slice(0, 7); // YYYY-MM
  const filename = `meshek_contractor_${monthStr}.csv`;

  await logAudit({
    actorId: (await (await createClient()).auth.getUser()).data.user!.id,
    tableName: "contractor_export",
    recordId: crypto.randomUUID(),
    action: "create",
    before: null,
    after: {
      from: params.fromDate,
      to: params.toDate,
      session_count: rows.length,
      total_hours: result.data.total_hours,
      total_dunam: result.data.total_dunam,
    },
  });

  return { success: true, data: { csvContent, filename } };
}

export async function getContractorDashboardStats(params: {
  fromDate: string;
  toDate: string;
}): Promise<ActionResult<ContractorDashboardStats>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const dateError = validateDateRange(params.fromDate, params.toDate);
  if (dateError) return { success: false, error: dateError };

  try {
    const rawData = await fetchContractorData(supabase, params);
    const sessions = aggregateToSessions(rawData);

    // Stats by client
    const clientMap = new Map<string, { hours: number; dunam: number; sessions: number }>();
    for (const s of sessions) {
      const existing = clientMap.get(s.client_name);
      if (existing) {
        existing.hours += s.total_hours;
        existing.dunam += s.dunam_covered ?? 0;
        existing.sessions += 1;
      } else {
        clientMap.set(s.client_name, {
          hours: s.total_hours,
          dunam: s.dunam_covered ?? 0,
          sessions: 1,
        });
      }
    }

    // Stats by work type
    const workTypeMap = new Map<string, number>();
    for (const s of sessions) {
      const wt = s.work_type ?? "לא צוין";
      workTypeMap.set(wt, (workTypeMap.get(wt) ?? 0) + 1);
    }

    return {
      success: true,
      data: {
        total_hours: sessions.reduce((sum, s) => sum + s.total_hours, 0),
        total_dunam: sessions.reduce((sum, s) => sum + (s.dunam_covered ?? 0), 0),
        session_count: sessions.length,
        active_clients: clientMap.size,
        by_client: Array.from(clientMap.entries())
          .map(([client_name, stats]) => ({ client_name, ...stats }))
          .sort((a, b) => b.hours - a.hours),
        by_work_type: Array.from(workTypeMap.entries())
          .map(([work_type, count]) => ({ work_type, count }))
          .sort((a, b) => b.count - a.count),
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
