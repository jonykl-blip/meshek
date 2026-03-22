"use client";

import { X } from "lucide-react";

export interface ChartFilter {
  type: "date" | "client" | "workType" | "worker";
  value: string;
  displayLabel: string;
}

interface ChartFilterChipProps {
  filter: ChartFilter;
  filterLabel: string;
  clearLabel: string;
  onClear: () => void;
}

export function ChartFilterChip({ filter, filterLabel, clearLabel, onClear }: ChartFilterChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-amber-50 px-3 py-1 text-sm dark:bg-amber-950/30">
      <span className="text-muted-foreground">{filterLabel}:</span>
      <span className="font-medium">{filter.displayLabel}</span>
      <button
        onClick={onClear}
        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-amber-200 transition-colors dark:hover:bg-amber-800"
        aria-label={clearLabel}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
