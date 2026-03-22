"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getOperationsDashboardData,
  exportContractorCsv,
  type OperationsDashboardData,
  type ContractorSessionRow,
  type DashboardScope,
} from "@/app/actions/contractor-reports";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { FilterBar } from "./components/filter-bar";
import { KpiCards } from "./components/kpi-cards";
import { ChartFilterChip, type ChartFilter } from "./components/chart-filter-chip";
import { DailyTimelineChart } from "./components/daily-timeline-chart";
import { WorkTypeDonut } from "./components/work-type-donut";
import { HorizontalBarChart } from "./components/horizontal-bar-chart";
import { MaterialUsage } from "./components/material-usage";
import { WorkerHoursChart } from "./components/worker-hours-chart";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  name: string;
}

interface WorkTypeOption {
  id: string;
  name_he: string;
}

export interface DashboardLabels {
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
  laborIntensity: string;
  avgCrewSize: string;
  hoursPerDunam: string;
  workersPerSession: string;
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
  loadData: string;
  loading: string;
  scopeAll: string;
  scopeContractor: string;
  scopeOwnFarm: string;
  allWorkTypes: string;
  byClientHours: string;
  byClientDunam: string;
  dailyActivity: string;
  workTypeByHours: string;
  materialUsage: string;
  workerHours: string;
  filterActive: string;
  clearFilter: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OperationsDashboard({
  clients,
  workTypes,
  labels,
}: {
  clients: ClientOption[];
  workTypes: WorkTypeOption[];
  labels: DashboardLabels;
}) {
  const currentMonth = getMonthRange(0);
  const [fromDate, setFromDate] = useState(currentMonth.from);
  const [toDate, setToDate] = useState(currentMonth.to);
  const [scope, setScope] = useState<DashboardScope>("all");
  const [clientId, setClientId] = useState("");
  const [workTypeId, setWorkTypeId] = useState("");
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [error, setError] = useState("");
  const [chartFilter, setChartFilter] = useState<ChartFilter | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  const loadData = useCallback(() => {
    setError("");
    setChartFilter(null);
    startTransition(async () => {
      const result = await getOperationsDashboardData({
        fromDate,
        toDate,
        scope,
        clientId: clientId || undefined,
        workTypeId: workTypeId || undefined,
      });
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    });
  }, [fromDate, toDate, scope, clientId, workTypeId]);

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

  // Filter session rows based on active chart filter
  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (!chartFilter) return data.session_rows;
    switch (chartFilter.type) {
      case "date":
        return data.session_rows.filter((r) => r.date === chartFilter.value);
      case "client":
        return data.session_rows.filter((r) => r.client_name === chartFilter.value);
      case "workType":
        return data.session_rows.filter((r) => (r.work_type ?? "לא צוין") === chartFilter.value);
      case "worker":
        return data.session_rows.filter((r) => r.workers.includes(chartFilter.value));
      default:
        return data.session_rows;
    }
  }, [data, chartFilter]);

  // KPI items
  const kpiItems = data
    ? [
        { label: labels.totalHours, value: data.total_hours.toFixed(1), unit: labels.hours },
        { label: labels.totalDunam, value: data.total_dunam.toFixed(0), unit: labels.dunam },
        {
          label: labels.laborIntensity,
          value: data.labor_intensity !== null ? data.labor_intensity.toFixed(1) : "—",
          unit: data.labor_intensity !== null ? labels.hoursPerDunam : undefined,
        },
        { label: labels.sessionCount, value: String(data.session_count), unit: labels.sessions },
        {
          label: labels.avgCrewSize,
          value: data.avg_crew_size.toFixed(1),
          unit: labels.workersPerSession,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        fromDate={fromDate}
        toDate={toDate}
        scope={scope}
        clientId={clientId}
        workTypeId={workTypeId}
        clients={clients}
        workTypes={workTypes}
        isPending={isPending}
        isExporting={isExporting}
        labels={labels}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onScopeChange={setScope}
        onClientIdChange={setClientId}
        onWorkTypeIdChange={setWorkTypeId}
        onLoad={loadData}
        onExport={handleExport}
        onSetMonth={setMonth}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          {data.session_count === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-8 text-center text-muted-foreground">
              {labels.noData}
            </div>
          ) : (
            /* Split Layout: Work Summary (left) | Analytics (right) */
            <div className="flex flex-col-reverse lg:flex-row gap-4">
              {/* Left Panel: Work Summary */}
              <div className="w-full lg:w-[38%] lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pe-2">
                {chartFilter && (
                  <div className="mb-3">
                    <ChartFilterChip
                      filter={chartFilter}
                      filterLabel={labels.filterActive}
                      clearLabel={labels.clearFilter}
                      onClear={() => setChartFilter(null)}
                    />
                  </div>
                )}
                <ClientWorkSummary rows={filteredRows} labels={labels} />
              </div>

              {/* Right Panel: Analytics Dashboard */}
              <div className="w-full lg:w-[62%] space-y-4">
                {/* KPI Cards */}
                <KpiCards items={kpiItems} />

                {/* Daily Timeline */}
                {data.by_date.length > 1 && (
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <DailyTimelineChart
                      data={data.by_date}
                      onBarClick={(date) =>
                        setChartFilter({ type: "date", value: date, displayLabel: formatDisplayDate(date) })
                      }
                    />
                  </div>
                )}

                {/* Work Type Donut + Client Hours side by side */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <WorkTypeDonut
                      data={data.by_work_type}
                      totalHours={data.total_hours}
                      onSegmentClick={(workType) =>
                        setChartFilter({ type: "workType", value: workType, displayLabel: workType })
                      }
                    />
                  </div>
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <HorizontalBarChart
                      data={data.by_client.map((c) => ({ name: c.client_name, value: c.hours }))}
                      title={labels.byClientHours}
                      unit={labels.hours}
                      onBarClick={(name) =>
                        setChartFilter({ type: "client", value: name, displayLabel: name })
                      }
                    />
                  </div>
                </div>

                {/* Dunam by Client */}
                {data.total_dunam > 0 && (
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <HorizontalBarChart
                      data={data.by_client
                        .filter((c) => c.dunam > 0)
                        .sort((a, b) => b.dunam - a.dunam)
                        .map((c) => ({ name: c.client_name, value: c.dunam }))}
                      title={labels.byClientDunam}
                      unit={labels.dunam}
                      color="hsl(var(--chart-2))"
                      onBarClick={(name) =>
                        setChartFilter({ type: "client", value: name, displayLabel: name })
                      }
                    />
                  </div>
                )}

                {/* Material Usage */}
                {data.by_material.length > 0 && (
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <MaterialUsage data={data.by_material} />
                  </div>
                )}

                {/* Worker Hours */}
                {data.by_worker.length > 0 && (
                  <WorkerHoursChart
                    data={data.by_worker}
                    onWorkerClick={(name) =>
                      setChartFilter({ type: "worker", value: name, displayLabel: name })
                    }
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Work Summary (preserved from existing code) ────────────────────────────

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
  labels: DashboardLabels;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {groupMode === "client" ? labels.workSummary : labels.workSummaryByDate}
        </h3>
        <div className="flex gap-1">
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
  labels: DashboardLabels;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2.5 cursor-pointer hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-semibold text-sm">{group.key}</span>
              <Badge variant="outline" className="text-xs">
                {group.rows.length}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{group.total_hours.toFixed(1)} {labels.hours}</span>
              {group.total_dunam > 0 && (
                <span>{group.total_dunam.toFixed(0)} {labels.dunam}</span>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {groupMode === "client" ? (
                    <th className="px-3 py-1.5 text-start font-medium">{labels.date}</th>
                  ) : (
                    <th className="px-3 py-1.5 text-start font-medium">{labels.client}</th>
                  )}
                  <th className="px-3 py-1.5 text-start font-medium">{labels.area}</th>
                  <th className="px-3 py-1.5 text-start font-medium">{labels.workType}</th>
                  <th className="px-3 py-1.5 text-start font-medium">{labels.hours}</th>
                  <th className="px-3 py-1.5 text-start font-medium">{labels.dunam}</th>
                  <th className="px-3 py-1.5 text-start font-medium">{labels.workers}</th>
                  <th className="px-3 py-1.5 text-start font-medium">{labels.materials}</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    {groupMode === "client" ? (
                      <td className="px-3 py-1.5 whitespace-nowrap">{formatDisplayDate(row.date)}</td>
                    ) : (
                      <td className="px-3 py-1.5">{row.client_name}</td>
                    )}
                    <td className="px-3 py-1.5">{row.area_name}</td>
                    <td className="px-3 py-1.5">{row.work_type ?? "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{row.total_hours.toFixed(1)}</td>
                    <td className="px-3 py-1.5">{row.dunam_covered ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      <span className="text-xs">{row.workers}</span>
                    </td>
                    <td className="px-3 py-1.5">
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
