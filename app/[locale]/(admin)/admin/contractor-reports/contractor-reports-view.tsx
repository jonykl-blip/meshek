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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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
  "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444",
  "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#6366F1",
];

const RADIAN = Math.PI / 180;

function renderOuterLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  value?: number;
}) {
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const midAngle = props.midAngle ?? 0;
  const outerRadius = props.outerRadius ?? 0;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const label = `${props.name ?? ""} (${props.value ?? 0})`;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
      fill="#374151"
    >
      {label}
    </text>
  );
}

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
              {/* Bar chart: hours by client */}
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold">{labels.byClient} — {labels.hours}</h3>
                <ResponsiveContainer width="100%" height={Math.max(300, stats.by_client.slice(0, 10).length * 38)}>
                  <BarChart data={stats.by_client.slice(0, 10)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 13, fontWeight: 600 }} />
                    <YAxis type="category" dataKey="client_name" width={160} tick={{ fontSize: 13, fontWeight: 600 }} />
                    <RechartsTooltip />
                    <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart: work type distribution */}
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold">{labels.byWorkType}</h3>
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie
                      data={stats.by_work_type}
                      dataKey="count"
                      nameKey="work_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={renderOuterLabel}
                      labelLine={{ stroke: "#9CA3AF", strokeWidth: 1 }}
                    >
                      {stats.by_work_type.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Dunam by client bar chart */}
              {stats.total_dunam > 0 && (
                <div className="rounded-lg border bg-card p-4 shadow-sm md:col-span-2">
                  <h3 className="mb-4 text-sm font-semibold">{labels.byClient} — {labels.dunam}</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={stats.by_client.filter((c) => c.dunam > 0)}>
                      <XAxis dataKey="client_name" tick={{ fontSize: 12, fontWeight: 600 }} angle={-35} textAnchor="end" height={70} interval={0} />
                      <YAxis tick={{ fontSize: 13, fontWeight: 600 }} />
                      <RechartsTooltip />
                      <Bar dataKey="dunam" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    {groupMode === "client" ? (
                      <td className="px-4 py-2 whitespace-nowrap">{formatDisplayDate(row.date)}</td>
                    ) : (
                      <td className="px-4 py-2">{row.client_name}</td>
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
