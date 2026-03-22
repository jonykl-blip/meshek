"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getContractorDashboardStats,
  getContractorInvoiceSummary,
  exportContractorCsv,
  type ContractorDashboardStats,
  type ContractorSessionRow,
} from "@/app/actions/contractor-reports";
import { ChevronDown, ChevronLeft } from "lucide-react";

interface Labels {
  fromDate: string;
  toDate: string;
  currentMonth: string;
  previousMonth: string;
  allClients: string;
  exportCsv: string;
  exporting: string;
  exportError: string;
  noData: string;
  totalHours: string;
  totalDunam: string;
  sessionCount: string;
  activeClients: string;
  byClient: string;
  byWorkType: string;
  hours: string;
  dunam: string;
  sessions: string;
  date: string;
  client: string;
  area: string;
  workType: string;
  materials: string;
  materialQty: string;
  workers: string;
  workerCount: string;
  notes: string;
  previewCount: string;
  workSummary: string;
  groupByClient: string;
  groupByDate: string;
  workSummaryByDate: string;
}

interface ClientOption {
  id: string;
  name: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function getMonthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const d = new Date(year, month, 1);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function ContractorReportsView({
  clients,
  labels,
}: {
  clients: ClientOption[];
  labels: Labels;
}) {
  const currentMonth = getMonthRange(0);
  const [fromDate, setFromDate] = useState(currentMonth.from);
  const [toDate, setToDate] = useState(currentMonth.to);
  const [clientId, setClientId] = useState("");
  const [stats, setStats] = useState<ContractorDashboardStats | null>(null);
  const [sessionRows, setSessionRows] = useState<ContractorSessionRow[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  const loadStats = useCallback(() => {
    setError("");
    startTransition(async () => {
      const [statsResult, sessionsResult] = await Promise.all([
        getContractorDashboardStats({ fromDate, toDate }),
        getContractorInvoiceSummary({ fromDate, toDate, clientId: clientId || undefined }),
      ]);
      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        setError(statsResult.error);
      }
      if (sessionsResult.success) {
        setSessionRows(sessionsResult.data.rows);
      }
    });
  }, [fromDate, toDate, clientId]);

  function setMonth(offset: number) {
    const range = getMonthRange(offset);
    setFromDate(range.from);
    setToDate(range.to);
  }

  function handleExport() {
    startExportTransition(async () => {
      const result = await exportContractorCsv({
        fromDate,
        toDate,
        clientId: clientId || undefined,
      });
      if (result.success) {
        const blob = new Blob([result.data.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setError(result.error);
      }
    });
  }

  const hoursTitle = `${labels.byClient} — ${labels.hours}`;
  const dunamTitle = `${labels.byClient} — ${labels.dunam}`;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <div>
          <Label>{labels.fromDate}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 w-40" />
        </div>
        <div>
          <Label>{labels.toDate}</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 w-40" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonth(0)}>{labels.currentMonth}</Button>
          <Button size="sm" variant="outline" onClick={() => setMonth(-1)}>{labels.previousMonth}</Button>
        </div>
        <div>
          <Label>{labels.client}</Label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 block w-48 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">{labels.allClients}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={loadStats} disabled={isPending}>
          {isPending ? "..." : labels.sessions}
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? labels.exporting : labels.exportCsv}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Summary Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label={labels.totalHours} value={stats.total_hours.toFixed(1)} />
            <SummaryCard label={labels.totalDunam} value={stats.total_dunam.toFixed(0)} />
            <SummaryCard label={labels.sessionCount} value={String(stats.session_count)} />
            <SummaryCard label={labels.activeClients} value={String(stats.active_clients)} />
          </div>

          {stats.session_count === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-8 text-center text-muted-foreground">
              {labels.noData}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Hours by client */}
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="mb-5 text-sm font-semibold text-muted-foreground">
                  {hoursTitle}
                </h3>
                <div className="space-y-3">
                  {stats.by_client.slice(0, 10).map((c) => (
                    <DataBar
                      key={c.client_name}
                      label={c.client_name}
                      value={c.hours}
                      maxValue={stats.by_client[0]?.hours ?? 1}
                      color={CHART_COLORS[0]}
                      format={(v) => v.toFixed(1)}
                    />
                  ))}
                </div>
              </div>

              {/* Work type breakdown */}
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="mb-5 text-sm font-semibold text-muted-foreground">
                  {labels.byWorkType}
                </h3>
                <div className="space-y-3">
                  {stats.by_work_type.map((wt, i) => {
                    const total = stats.by_work_type.reduce((s, w) => s + w.count, 0);
                    const pct = total > 0 ? Math.round((wt.count / total) * 100) : 0;
                    return (
                      <WorkTypeRow
                        key={wt.work_type}
                        name={wt.work_type}
                        count={wt.count}
                        percentage={pct}
                        maxCount={stats.by_work_type[0]?.count ?? 1}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Dunam by client */}
              {stats.total_dunam > 0 && (
                <div className="rounded-xl border bg-card p-5 shadow-sm md:col-span-2">
                  <h3 className="mb-5 text-sm font-semibold text-muted-foreground">
                    {dunamTitle}
                  </h3>
                  <div className="space-y-3">
                    {stats.by_client
                      .filter((c) => c.dunam > 0)
                      .sort((a, b) => b.dunam - a.dunam)
                      .map((c) => (
                        <DataBar
                          key={c.client_name}
                          label={c.client_name}
                          value={c.dunam}
                          maxValue={Math.max(...stats.by_client.map((x) => x.dunam))}
                          color={CHART_COLORS[1]}
                          format={(v) => v.toFixed(0)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Work summary by client */}
          {sessionRows.length > 0 && (
            <ClientWorkSummary rows={sessionRows} labels={labels} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Work Summary (grouped detail table with client/date toggle) ─────────────

type GroupMode = "client" | "date";

interface RecordGroup {
  key: string;
  sortKey: string;
  rows: ContractorSessionRow[];
  total_hours: number;
  total_dunam: number;
}

function ClientWorkSummary({
  rows,
  labels,
}: {
  rows: ContractorSessionRow[];
  labels: Labels;
}) {
  const [groupMode, setGroupMode] = useState<GroupMode>("client");

  const groups = useMemo(() => {
    const map = new Map<string, ContractorSessionRow[]>();
    for (const row of rows) {
      const groupKey = groupMode === "client" ? row.client_name : row.date;
      const existing = map.get(groupKey) ?? [];
      existing.push(row);
      map.set(groupKey, existing);
    }
    const result: RecordGroup[] = [];
    for (const [rawKey, groupRows] of map) {
      result.push({
        key: groupMode === "date" ? formatDisplayDate(rawKey) : rawKey,
        sortKey: rawKey,
        rows: groupRows,
        total_hours: groupRows.reduce((s, r) => s + r.total_hours, 0),
        total_dunam: groupRows.reduce((s, r) => s + (r.dunam_covered ?? 0), 0),
      });
    }
    return groupMode === "client"
      ? result.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "he"))
      : result.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [rows, groupMode]);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {groupMode === "client" ? labels.workSummary : labels.workSummaryByDate}
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={groupMode === "client" ? "default" : "outline"}
            onClick={() => setGroupMode("client")}
          >
            {labels.groupByClient}
          </Button>
          <Button
            size="sm"
            variant={groupMode === "date" ? "default" : "outline"}
            onClick={() => setGroupMode("date")}
          >
            {labels.groupByDate}
          </Button>
        </div>
      </div>
      {groups.map((group) => (
        <GroupSection key={group.sortKey} group={group} groupMode={groupMode} labels={labels} />
      ))}
    </div>
  );
}

function GroupSection({
  group,
  groupMode,
  labels,
}: {
  group: RecordGroup;
  groupMode: GroupMode;
  labels: Labels;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between bg-muted/50 px-4 py-3 cursor-pointer hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-semibold">{group.key}</span>
              <Badge variant="outline" className="text-xs">
                {group.rows.length}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{group.total_hours.toFixed(1)} {labels.hours}</span>
              {group.total_dunam > 0 && (
                <span>{group.total_dunam.toFixed(0)} {labels.dunam}</span>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {groupMode === "client" ? (
                    <th className="px-4 py-2 text-start font-medium">{labels.date}</th>
                  ) : (
                    <th className="px-4 py-2 text-start font-medium">{labels.client}</th>
                  )}
                  <th className="px-4 py-2 text-start font-medium">{labels.area}</th>
                  <th className="px-4 py-2 text-start font-medium">{labels.workType}</th>
                  <th className="px-4 py-2 text-start font-medium">{labels.hours}</th>
                  <th className="px-4 py-2 text-start font-medium">{labels.dunam}</th>
                  <th className="px-4 py-2 text-start font-medium">{labels.workers}</th>
                  <th className="px-4 py-2 text-start font-medium">{labels.materials}</th>
                  <th className="px-4 py-2 text-start font-medium">{labels.materialQty}</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    {groupMode === "client" ? (
                      <td className="px-4 py-2 whitespace-nowrap">{formatDisplayDate(row.date)}</td>
                    ) : (
                      <td className="px-4 py-2">{row.is_own_farm ? <span className="text-muted-foreground italic">{row.client_name}</span> : row.client_name}</td>
                    )}
                    <td className="px-4 py-2">{row.area_name}</td>
                    <td className="px-4 py-2">{row.work_type ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.total_hours.toFixed(1)}</td>
                    <td className="px-4 py-2">{row.dunam_covered ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs">{row.workers}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-muted-foreground">{row.materials || "—"}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-muted-foreground">{row.material_qty_label || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─── Pure CSS Data Visualization Components ─────────────────────────────────

function DataBar({
  label,
  value,
  maxValue,
  color,
  format,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  format: (v: number) => string;
}) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;
  const formatted = format(value);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm font-medium">{label}</span>
      <div className="relative flex-1 h-4 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="absolute inset-y-0 start-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-14 shrink-0 text-end text-sm font-semibold tabular-nums">
        {formatted}
      </span>
    </div>
  );
}

function WorkTypeRow({
  name,
  count,
  percentage,
  maxCount,
  color,
}: {
  name: string;
  count: number;
  percentage: number;
  maxCount: number;
  color: string;
}) {
  const pct = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0;
  const pctLabel = `${percentage}%`;
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="w-24 shrink-0 truncate text-sm font-medium">{name}</span>
      <div className="relative flex-1 h-3 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="absolute inset-y-0 start-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="w-6 shrink-0 text-end text-sm font-semibold tabular-nums">{count}</span>
      <span className="w-10 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
        {pctLabel}
      </span>
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
