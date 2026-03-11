"use client";

import { useId, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

export interface PayrollFilterLabels {
  fromDate: string;
  toDate: string;
  currentMonth: string;
  previousMonth: string;
}

interface PayrollFiltersProps {
  labels: PayrollFilterLabels;
  currentFilters: { fromDate: string; toDate: string };
  todayJerusalem: string;
}

export function PayrollFilters({
  labels,
  currentFilters,
  todayJerusalem,
}: PayrollFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fromId = useId();
  const toId = useId();

  function navigate(from: string, to: string) {
    startTransition(() => {
      router.replace(`/admin/payroll?from=${from}&to=${to}`);
    });
  }

  function handleDateChange(key: "from" | "to", value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    navigate(
      key === "from" ? value : currentFilters.fromDate,
      key === "to" ? value : currentFilters.toDate
    );
  }

  function setCurrentMonth() {
    const firstOfMonth = todayJerusalem.slice(0, 8) + "01";
    navigate(firstOfMonth, todayJerusalem);
  }

  function setPreviousMonth() {
    const [year, month] = todayJerusalem.split("-").map(Number);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const lastDay = new Date(year, month - 1, 0).getDate();
    const from = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const to = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    navigate(from, to);
  }

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3 transition-opacity${isPending ? " opacity-60" : ""}`}
    >
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
            onChange={(e) => handleDateChange("from", e.target.value)}
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
            onChange={(e) => handleDateChange("to", e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={setCurrentMonth}
          disabled={isPending}
          className="rounded border bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          {labels.currentMonth}
        </button>
        <button
          type="button"
          onClick={setPreviousMonth}
          disabled={isPending}
          className="rounded border bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
        >
          {labels.previousMonth}
        </button>
      </div>
    </div>
  );
}
