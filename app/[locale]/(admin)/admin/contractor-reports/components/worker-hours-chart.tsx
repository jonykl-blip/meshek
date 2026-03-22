"use client";

import { useState, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { HorizontalBarChart } from "./horizontal-bar-chart";

interface Props {
  data: { worker_name: string; hours: number; sessions: number }[];
  onWorkerClick?: (workerName: string) => void;
}

export function WorkerHoursChart({ data, onWorkerClick }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const barData = useMemo(
    () => data.slice(0, 8).map((d) => ({ name: d.worker_name, value: d.hours })),
    [data],
  );

  if (data.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-1 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          שעות לפי עובד
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <HorizontalBarChart
          data={barData}
          title=""
          unit="שע׳"
          maxItems={8}
          onBarClick={onWorkerClick}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
