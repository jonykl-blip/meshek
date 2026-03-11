"use client";

import { useId } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

export interface AttendanceFilterLabels {
  fromDate: string;
  toDate: string;
  allWorkers: string;
  allAreas: string;
  filterLabel: string;
  clearAll: string;
  activeFilters: string;
}

interface AttendanceFiltersProps {
  workers: { id: string; full_name: string }[];
  areas: { id: string; name: string }[];
  labels: AttendanceFilterLabels;
  currentFilters: {
    fromDate: string;
    toDate: string;
    workerId: string;
    areaId: string;
  };
  todayJerusalem: string;
}

export function AttendanceFilters({
  workers,
  areas,
  labels,
  currentFilters,
  todayJerusalem,
}: AttendanceFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fromId = useId();
  const toId = useId();
  const workerId = useId();
  const areaId = useId();

  const updateFilter = (key: string, value: string) => {
    startTransition(() => {
      const next = {
        from: key === "from" ? value : currentFilters.fromDate,
        to: key === "to" ? value : currentFilters.toDate,
        workerId: key === "workerId" ? value : currentFilters.workerId,
        areaId: key === "areaId" ? value : currentFilters.areaId,
      };
      const params = new URLSearchParams({ from: next.from, to: next.to });
      if (next.workerId) params.set("workerId", next.workerId);
      if (next.areaId) params.set("areaId", next.areaId);
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.push(
        `/dashboard?from=${todayJerusalem}&to=${todayJerusalem}`
      );
    });
  };

  const isDateChanged =
    currentFilters.fromDate !== todayJerusalem ||
    currentFilters.toDate !== todayJerusalem;
  const activeCount =
    (isDateChanged ? 1 : 0) +
    (currentFilters.workerId ? 1 : 0) +
    (currentFilters.areaId ? 1 : 0);

  const filterBadgeLabel =
    activeCount > 0
      ? labels.activeFilters.replace("{count}", String(activeCount))
      : labels.filterLabel;

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3 transition-opacity${isPending ? " opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{filterBadgeLabel}</span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={isPending}
            className="text-sm text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            {labels.clearAll}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-xs text-muted-foreground">
            {labels.fromDate}
          </label>
          <input
            id={fromId}
            type="date"
            value={currentFilters.fromDate}
            max={currentFilters.toDate}
            disabled={isPending}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-xs text-muted-foreground">
            {labels.toDate}
          </label>
          <input
            id={toId}
            type="date"
            value={currentFilters.toDate}
            min={currentFilters.fromDate}
            disabled={isPending}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={workerId} className="text-xs text-muted-foreground">
            {labels.allWorkers}
          </label>
          <select
            id={workerId}
            value={currentFilters.workerId}
            disabled={isPending}
            onChange={(e) => updateFilter("workerId", e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="">{labels.allWorkers}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={areaId} className="text-xs text-muted-foreground">
            {labels.allAreas}
          </label>
          <select
            id={areaId}
            value={currentFilters.areaId}
            disabled={isPending}
            onChange={(e) => updateFilter("areaId", e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="">{labels.allAreas}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
