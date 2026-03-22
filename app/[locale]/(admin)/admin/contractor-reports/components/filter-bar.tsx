"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DashboardScope } from "@/app/actions/contractor-reports";

interface ClientOption {
  id: string;
  name: string;
}

interface WorkTypeOption {
  id: string;
  name_he: string;
}

interface Labels {
  fromDate: string;
  toDate: string;
  currentMonth: string;
  previousMonth: string;
  allClients: string;
  client: string;
  workType: string;
  allWorkTypes: string;
  loadData: string;
  loading: string;
  exportCsv: string;
  exporting: string;
  scopeAll: string;
  scopeContractor: string;
  scopeOwnFarm: string;
}

interface FilterBarProps {
  fromDate: string;
  toDate: string;
  scope: DashboardScope;
  clientId: string;
  workTypeId: string;
  clients: ClientOption[];
  workTypes: WorkTypeOption[];
  isPending: boolean;
  isExporting: boolean;
  labels: Labels;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onScopeChange: (v: DashboardScope) => void;
  onClientIdChange: (v: string) => void;
  onWorkTypeIdChange: (v: string) => void;
  onLoad: () => void;
  onExport: () => void;
  onSetMonth: (offset: number) => void;
}

const SCOPE_OPTIONS: { value: DashboardScope; labelKey: keyof Pick<Labels, "scopeAll" | "scopeContractor" | "scopeOwnFarm"> }[] = [
  { value: "all", labelKey: "scopeAll" },
  { value: "contractor", labelKey: "scopeContractor" },
  { value: "own_farm", labelKey: "scopeOwnFarm" },
];

export function FilterBar({
  fromDate,
  toDate,
  scope,
  clientId,
  workTypeId,
  clients,
  workTypes,
  isPending,
  isExporting,
  labels,
  onFromDateChange,
  onToDateChange,
  onScopeChange,
  onClientIdChange,
  onWorkTypeIdChange,
  onLoad,
  onExport,
  onSetMonth,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
      <div>
        <Label>{labels.fromDate}</Label>
        <Input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className="mt-1 w-40" />
      </div>
      <div>
        <Label>{labels.toDate}</Label>
        <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="mt-1 w-40" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onSetMonth(0)}>{labels.currentMonth}</Button>
        <Button size="sm" variant="outline" onClick={() => onSetMonth(-1)}>{labels.previousMonth}</Button>
      </div>

      {/* Scope toggle */}
      <div className="flex rounded-md border overflow-hidden">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onScopeChange(opt.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            }`}
          >
            {labels[opt.labelKey]}
          </button>
        ))}
      </div>

      {/* Client filter — hide when scope is own_farm */}
      {scope !== "own_farm" && (
        <div>
          <Label>{labels.client}</Label>
          <select
            value={clientId}
            onChange={(e) => onClientIdChange(e.target.value)}
            className="mt-1 block w-48 rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">{labels.allClients}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Work type filter */}
      <div>
        <Label>{labels.workType}</Label>
        <select
          value={workTypeId}
          onChange={(e) => onWorkTypeIdChange(e.target.value)}
          className="mt-1 block w-48 rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">{labels.allWorkTypes}</option>
          {workTypes.map((wt) => (
            <option key={wt.id} value={wt.id}>{wt.name_he}</option>
          ))}
        </select>
      </div>

      <Button onClick={onLoad} disabled={isPending}>
        {isPending ? labels.loading : labels.loadData}
      </Button>
      <Button variant="outline" onClick={onExport} disabled={isExporting}>
        {isExporting ? labels.exporting : labels.exportCsv}
      </Button>
    </div>
  );
}
