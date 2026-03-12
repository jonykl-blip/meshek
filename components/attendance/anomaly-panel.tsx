import type { AnomalyResult } from "@/app/actions/attendance";

export interface AnomalyPanelLabels {
  allClear: string;
  excessiveHoursHeading: string;
  stalePendingHeading: string;
  unknownWorker: string;
  unknownArea: string;
}

export function AnomalyPanel({
  data,
  labels,
}: {
  data: AnomalyResult;
  labels: AnomalyPanelLabels;
}) {
  const hasExcessive = data.excessiveHours.length > 0;
  const hasStale = data.stalePending.length > 0;

  if (!hasExcessive && !hasStale) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[rgba(91,122,47,0.2)] bg-[rgba(91,122,47,0.08)] p-4 shadow-md text-sm text-green-700 text-start animate-fade-slide-up">
        {labels.allClear}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[rgba(221,214,204,0.4)] bg-[var(--card)] p-4 shadow-md space-y-4 animate-fade-slide-up">
      {hasExcessive && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 text-start">
            {labels.excessiveHoursHeading}
          </h3>
          <ul className="space-y-1">
            {data.excessiveHours.map((r) => (
              <li key={r.id} className="text-sm text-start rounded-[var(--radius-sm)] bg-[rgba(192,57,43,0.10)] px-3 py-1.5">
                {r.worker_name ?? labels.unknownWorker} —{" "}
                {r.area_name ?? labels.unknownArea} —{" "}
                {r.work_date} —{" "}
                <span className="font-medium">{r.total_hours != null ? `${r.total_hours}h` : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {hasStale && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 text-start">
            {labels.stalePendingHeading}
          </h3>
          <ul className="space-y-1">
            {data.stalePending.map((r) => (
              <li key={r.id} className="text-sm text-start rounded-[var(--radius-sm)] bg-[rgba(196,155,48,0.12)] px-3 py-1.5">
                {r.worker_name ?? labels.unknownWorker} —{" "}
                {r.area_name ?? labels.unknownArea} —{" "}
                {r.work_date} —{" "}
                {r.total_hours != null ? `${r.total_hours}h` : "—"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
