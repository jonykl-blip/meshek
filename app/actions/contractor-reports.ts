"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyAdminCaller, type ActionResult } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

export interface ContractorSessionRow {
  date: string;
  client_name: string;
  is_own_farm: boolean;
  area_name: string;
  dunam_covered: number | null;
  work_type: string | null;
  materials: string;
  material_qty_label: string;
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

export type DashboardScope = "all" | "contractor" | "own_farm";

export interface DashboardParams {
  fromDate: string;
  toDate: string;
  clientId?: string;
  scope: DashboardScope;
  workTypeId?: string;
}

export interface OperationsDashboardData {
  total_hours: number;
  total_dunam: number;
  session_count: number;
  active_clients: number;
  avg_crew_size: number;
  labor_intensity: number | null;
  by_client: { client_name: string; hours: number; dunam: number; sessions: number }[];
  by_work_type: { work_type: string; hours: number; sessions: number; pct: number }[];
  by_date: { date: string; hours: number; by_work_type: Record<string, number> }[];
  by_worker: { worker_name: string; hours: number; sessions: number }[];
  by_material: { material_name: string; total_quantity: number; unit: string }[];
  session_rows: ContractorSessionRow[];
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
    clients: { name: string; is_own_farm: boolean } | null;
  } | null;
  work_types: { name_he: string } | null;
  work_log_materials: { quantity: number | null; unit: string | null; materials: { name_he: string } | null }[] | null;
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

function getMaterialNames(row: RawContractorRow): string {
  const names = (row.work_log_materials ?? [])
    .map((wlm) => wlm.materials?.name_he)
    .filter(Boolean);
  return names.join("; ");
}

function getMaterialQtyLabel(row: RawContractorRow): string {
  const qtys = (row.work_log_materials ?? [])
    .map((wlm) => {
      if (!wlm.quantity) return null;
      return `${wlm.quantity} ${wlm.unit ?? ""}`.trim();
    })
    .filter(Boolean);
  return qtys.join("; ");
}

/** Combined label for session key grouping (keeps backward compat) */
function getMaterialLabel(row: RawContractorRow): string {
  const mats = (row.work_log_materials ?? [])
    .map((wlm) => {
      const name = wlm.materials?.name_he;
      if (!name) return null;
      return wlm.quantity ? `${name} ${wlm.quantity} ${wlm.unit ?? ""}`.trim() : name;
    })
    .filter(Boolean);
  return mats.join("; ");
}

function buildSessionKey(row: RawContractorRow): SessionKey {
  const areaId = row.areas?.client_id ?? "unknown";
  const areaName = row.areas?.name ?? "unknown";
  const workType = row.work_types?.name_he ?? "unknown";
  const materials = getMaterialLabel(row);
  return `${row.work_date}|${areaId}|${areaName}|${workType}|${materials}`;
}

interface SessionAccumulator {
  date: string;
  client_name: string;
  is_own_farm: boolean;
  area_name: string;
  work_type: string | null;
  dunam_covered: number | null;
  materials: string;
  material_qty_label: string;
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
        is_own_farm: row.areas?.clients?.is_own_farm ?? false,
        area_name: row.areas?.name ?? "לא ידוע",
        work_type: row.work_types?.name_he ?? null,
        dunam_covered: row.dunam_covered,
        materials: getMaterialNames(row),
        material_qty_label: getMaterialQtyLabel(row),
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
      is_own_farm: s.is_own_farm,
      area_name: s.area_name,
      dunam_covered: s.dunam_covered,
      work_type: s.work_type,
      materials: s.materials,
      material_qty_label: s.material_qty_label,
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
      "id, work_date, total_hours, dunam_covered, raw_transcript, profiles(full_name), areas!inner(name, client_id, clients!inner(name, is_own_farm)), work_types(name_he), work_log_materials(quantity, unit, materials(name_he))",
    )
    .eq("status", "approved")
    .gte("work_date", params.fromDate)
    .lte("work_date", params.toDate);

  if (params.clientId) {
    query = query.eq("areas.client_id", params.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RawContractorRow[];
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
    "חומר",
    "כמות חומר",
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
    "(Material)",
    "(Material Qty)",
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
      csvEscape(r.material_qty_label),
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

// ─── Operations Dashboard (new unified action) ──────────────────────────────

async function fetchOperationsData(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  params: DashboardParams,
): Promise<RawContractorRow[]> {
  let query = supabase
    .from("attendance_logs")
    .select(
      "id, work_date, total_hours, dunam_covered, raw_transcript, profiles(full_name), areas!inner(name, client_id, clients!inner(name, is_own_farm)), work_types(name_he), work_log_materials(quantity, unit, materials(name_he))",
    )
    .eq("status", "approved")
    .gte("work_date", params.fromDate)
    .lte("work_date", params.toDate);

  if (params.scope === "contractor") {
    query = query.eq("areas.clients.is_own_farm", false);
  } else if (params.scope === "own_farm") {
    query = query.eq("areas.clients.is_own_farm", true);
  }

  if (params.clientId) {
    query = query.eq("areas.client_id", params.clientId);
  }

  if (params.workTypeId) {
    query = query.eq("work_type_id", params.workTypeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RawContractorRow[];
}

export async function getOperationsDashboardData(
  params: DashboardParams,
): Promise<ActionResult<OperationsDashboardData>> {
  const supabase = await createClient();
  const { user, error: authError } = await verifyAdminCaller(supabase);
  if (!user) return { success: false, error: authError };

  const dateError = validateDateRange(params.fromDate, params.toDate);
  if (dateError) return { success: false, error: dateError };

  try {
    const rawData = await fetchOperationsData(supabase, params);
    const sessions = aggregateToSessions(rawData);

    const total_hours = sessions.reduce((sum, s) => sum + s.total_hours, 0);
    const total_dunam = sessions.reduce((sum, s) => sum + (s.dunam_covered ?? 0), 0);
    const total_workers = sessions.reduce((sum, s) => sum + s.worker_count, 0);

    // By client
    const clientMap = new Map<string, { hours: number; dunam: number; sessions: number }>();
    for (const s of sessions) {
      const existing = clientMap.get(s.client_name);
      if (existing) {
        existing.hours += s.total_hours;
        existing.dunam += s.dunam_covered ?? 0;
        existing.sessions += 1;
      } else {
        clientMap.set(s.client_name, { hours: s.total_hours, dunam: s.dunam_covered ?? 0, sessions: 1 });
      }
    }

    // By work type — aggregate by HOURS (not session count)
    const wtMap = new Map<string, { hours: number; sessions: number }>();
    for (const s of sessions) {
      const wt = s.work_type ?? "לא צוין";
      const existing = wtMap.get(wt);
      if (existing) {
        existing.hours += s.total_hours;
        existing.sessions += 1;
      } else {
        wtMap.set(wt, { hours: s.total_hours, sessions: 1 });
      }
    }

    // By date (for timeline chart) — with work type sub-breakdown
    const dateMap = new Map<string, { hours: number; by_work_type: Map<string, number> }>();
    for (const s of sessions) {
      const existing = dateMap.get(s.date);
      const wt = s.work_type ?? "לא צוין";
      if (existing) {
        existing.hours += s.total_hours;
        existing.by_work_type.set(wt, (existing.by_work_type.get(wt) ?? 0) + s.total_hours);
      } else {
        const byWt = new Map<string, number>();
        byWt.set(wt, s.total_hours);
        dateMap.set(s.date, { hours: s.total_hours, by_work_type: byWt });
      }
    }

    // By worker — aggregate from raw data (before session grouping)
    const workerMap = new Map<string, { hours: number; sessions: Set<string> }>();
    for (const row of rawData) {
      const name = (row.profiles as { full_name: string } | null)?.full_name ?? "לא ידוע";
      const existing = workerMap.get(name);
      const sessionKey = buildSessionKey(row);
      if (existing) {
        existing.hours += row.total_hours ?? 0;
        existing.sessions.add(sessionKey);
      } else {
        workerMap.set(name, { hours: row.total_hours ?? 0, sessions: new Set([sessionKey]) });
      }
    }

    // By material — aggregate from raw data
    const materialMap = new Map<string, { total_quantity: number; unit: string }>();
    for (const row of rawData) {
      for (const wlm of row.work_log_materials ?? []) {
        const name = wlm.materials?.name_he;
        if (!name) continue;
        const existing = materialMap.get(name);
        if (existing) {
          existing.total_quantity += wlm.quantity ?? 0;
        } else {
          materialMap.set(name, { total_quantity: wlm.quantity ?? 0, unit: wlm.unit ?? "" });
        }
      }
    }

    const by_work_type = Array.from(wtMap.entries())
      .map(([work_type, stats]) => ({
        work_type,
        hours: stats.hours,
        sessions: stats.sessions,
        pct: total_hours > 0 ? Math.round((stats.hours / total_hours) * 100) : 0,
      }))
      .sort((a, b) => b.hours - a.hours);

    return {
      success: true,
      data: {
        total_hours,
        total_dunam,
        session_count: sessions.length,
        active_clients: clientMap.size,
        avg_crew_size: sessions.length > 0 ? total_workers / sessions.length : 0,
        labor_intensity: total_dunam > 0 ? total_hours / total_dunam : null,
        by_client: Array.from(clientMap.entries())
          .map(([client_name, stats]) => ({ client_name, ...stats }))
          .sort((a, b) => b.hours - a.hours),
        by_work_type,
        by_date: Array.from(dateMap.entries())
          .map(([date, d]) => ({
            date,
            hours: d.hours,
            by_work_type: Object.fromEntries(d.by_work_type),
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        by_worker: Array.from(workerMap.entries())
          .map(([worker_name, d]) => ({ worker_name, hours: d.hours, sessions: d.sessions.size }))
          .sort((a, b) => b.hours - a.hours),
        by_material: Array.from(materialMap.entries())
          .map(([material_name, d]) => ({ material_name, ...d }))
          .sort((a, b) => b.total_quantity - a.total_quantity),
        session_rows: sessions,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
