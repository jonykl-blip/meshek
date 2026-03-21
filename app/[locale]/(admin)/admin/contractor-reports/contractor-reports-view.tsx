"use client";

import { useState, useTransition, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getContractorDashboardStats,
  exportContractorCsv,
  type ContractorDashboardStats,
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
}

interface ClientOption {
  id: string;
  name: string;
}

const CHART_COLORS = [
  "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444",
  "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#6366F1",
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
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  const loadStats = useCallback(() => {
    setError("");
    startTransition(async () => {
      const result = await getContractorDashboardStats({ fromDate, toDate });
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
    });
  }, [fromDate, toDate]);

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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.by_client.slice(0, 10)} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="client_name" width={120} tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart: work type distribution */}
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold">{labels.byWorkType}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.by_work_type}
                      dataKey="count"
                      nameKey="work_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""} (${value ?? 0})`}
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
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.by_client.filter((c) => c.dunam > 0)}>
                      <XAxis dataKey="client_name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="dunam" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
