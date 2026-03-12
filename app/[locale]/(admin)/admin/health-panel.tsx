"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthPanelLabels {
  title: string;
  totalRecords: string;
  pendingRecords: string;
  unmatchedRate: string;
  unmatchedRateHigh: string;
  staleAlert: string;
  workersLastUpdated: string;
  areasLastUpdated: string;
  noRecordsThisMonth: string;
  daysAgo: string;
}

interface HealthPanelProps {
  totalRecords: number;
  pendingCount: number;
  unmatchedRate: number;
  isStale: boolean;
  workersLastUpdated: string | null;
  areasLastUpdated: string | null;
  labels: HealthPanelLabels;
}

function formatDaysAgo(dateStr: string | null, template: string): string {
  if (!dateStr) return template.replace("{days}", "∞");
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  return template.replace("{days}", String(diffDays));
}

export function HealthPanel({
  totalRecords,
  pendingCount,
  unmatchedRate,
  isStale,
  workersLastUpdated,
  areasLastUpdated,
  labels,
}: HealthPanelProps) {
  const isHighRate = unmatchedRate > 10;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{labels.title}</h2>
      {isStale && (
        <div className="mb-4 rounded-lg border border-amber-400 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">{labels.staleAlert}</p>
          <p className="mt-1 text-sm">
            {labels.workersLastUpdated}:{" "}
            {formatDaysAgo(workersLastUpdated, labels.daysAgo)}
          </p>
          <p className="text-sm">
            {labels.areasLastUpdated}:{" "}
            {formatDaysAgo(areasLastUpdated, labels.daysAgo)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {labels.totalRecords}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {totalRecords === 0 ? (
                <span className="text-lg text-muted-foreground">
                  {labels.noRecordsThisMonth}
                </span>
              ) : (
                totalRecords
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {labels.pendingRecords}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card
          className={
            isHighRate ? "shadow-sm border-amber-500 bg-amber-50" : "shadow-sm"
          }
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {labels.unmatchedRate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{unmatchedRate.toFixed(1)}%</p>
            {isHighRate && (
              <p className="mt-2 text-sm text-amber-700">
                {labels.unmatchedRateHigh}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
