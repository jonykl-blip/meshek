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
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 text-start">
        {labels.allClear}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {hasExcessive && (
        <section>
          <h3 className="text-sm font-semibold text-red-600 mb-2 text-start">
            {labels.excessiveHoursHeading}
          </h3>
          <ul className="space-y-1">
            {data.excessiveHours.map((r) => (
              <li key={r.id} className="text-sm text-start">
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
          <h3 className="text-sm font-semibold text-amber-600 mb-2 text-start">
            {labels.stalePendingHeading}
          </h3>
          <ul className="space-y-1">
            {data.stalePending.map((r) => (
              <li key={r.id} className="text-sm text-start">
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
