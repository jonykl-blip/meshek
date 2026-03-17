import { Fragment } from "react";
import type { DailyAttendanceRecord } from "@/app/actions/attendance";
import { getInitials } from "@/lib/format";
import {
  AttendanceRowActions,
  type AttendanceRowActionsLabels,
} from "./attendance-row-actions";
import type { EditRecordDialogLabels } from "./edit-record-dialog";

export interface AttendanceTableLabels {
  title: string;
  worker: string;
  area: string;
  hours: string;
  status: string;
  totalHours: string;
  emptyState: string;
  approved: string;
  imported: string;
  noArea: string;
  pending: string;
  rejected: string;
  actions: string;
  unknownWorker: string;
}

export type { AttendanceRowActionsLabels };

interface AttendanceTableProps {
  records: DailyAttendanceRecord[];
  labels: AttendanceTableLabels;
  actionLabels: AttendanceRowActionsLabels;
  editLabels: EditRecordDialogLabels;
  areas: { id: string; name: string }[];
  currentDate?: string;
  isMultiDay?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const rangeDateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("he-IL");

function StatusBadge({
  status,
  labels,
}: {
  status: DailyAttendanceRecord["status"];
  labels: AttendanceTableLabels;
}) {
  const styles: Record<string, string> = {
    approved:
      "bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]",
    pending:
      "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
    rejected:
      "bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]",
    imported:
      "bg-[var(--status-imported-bg)] text-[var(--status-imported-text)]",
  };

  const labelMap: Record<string, string> = {
    approved: labels.approved,
    pending: labels.pending,
    rejected: labels.rejected,
    imported: labels.imported,
  };

  const key = status ?? "imported";

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[key] ?? styles.imported}`}
    >
      {labelMap[key] ?? labels.imported}
    </span>
  );
}

function WorkerCell({
  name,
  fallback,
}: {
  name: string | null;
  fallback: string;
}) {
  const displayName = name ?? fallback;
  const initials = name ? getInitials(name) : "?";

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground/70 shrink-0">
        {initials}
      </span>
      <span>{displayName}</span>
    </div>
  );
}

function RecordRow({
  record,
  labels,
  actionLabels,
  editLabels,
  areas,
  hasEditableRecords,
  isEven,
}: {
  record: DailyAttendanceRecord;
  labels: AttendanceTableLabels;
  actionLabels: AttendanceRowActionsLabels;
  editLabels: EditRecordDialogLabels;
  areas: { id: string; name: string }[];
  hasEditableRecords: boolean;
  isEven: boolean;
}) {
  return (
    <tr
      className={`group border-b last:border-b-0 transition-colors duration-200 hover:bg-[rgba(37,99,235,0.04)] hover:border-s-[3px] hover:border-s-accent${isEven ? " bg-[rgba(37,99,235,0.03)]" : ""}`}
    >
      <td className="px-4 py-3">
        <WorkerCell name={record.worker_name} fallback={labels.unknownWorker} />
      </td>
      <td className="px-4 py-3">{record.area_name ?? labels.noArea}</td>
      <td className="px-4 py-3">
        {record.total_hours != null
          ? numberFormatter.format(record.total_hours)
          : "—"}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={record.status} labels={labels} />
      </td>
      {hasEditableRecords && (
        <td className="px-4 py-3">
          <AttendanceRowActions
            recordId={record.id}
            status={record.status}
            profileId={record.profile_id}
            areaId={record.area_id}
            totalHours={record.total_hours}
            areaName={record.area_name}
            workerName={record.worker_name}
            areas={areas}
            labels={actionLabels}
            editLabels={editLabels}
          />
        </td>
      )}
    </tr>
  );
}

function RecordCard({
  record,
  labels,
  actionLabels,
  editLabels,
  areas,
  hasEditableRecords,
}: {
  record: DailyAttendanceRecord;
  labels: AttendanceTableLabels;
  actionLabels: AttendanceRowActionsLabels;
  editLabels: EditRecordDialogLabels;
  areas: { id: string; name: string }[];
  hasEditableRecords: boolean;
}) {
  const displayName = record.worker_name ?? labels.unknownWorker;
  const initials = record.worker_name ? getInitials(record.worker_name) : "?";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground/70 shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {record.area_name ?? labels.noArea}
            </p>
          </div>
        </div>
        <StatusBadge status={record.status} labels={labels} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {record.total_hours != null
              ? numberFormatter.format(record.total_hours)
              : "—"}
          </span>
          <span>{labels.hours}</span>
        </div>
        {hasEditableRecords && (
          <div className="flex items-center">
            <AttendanceRowActions
              recordId={record.id}
              status={record.status}
              profileId={record.profile_id}
              areaId={record.area_id}
              totalHours={record.total_hours}
              areaName={record.area_name}
              workerName={record.worker_name}
              areas={areas}
              labels={actionLabels}
              editLabels={editLabels}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function AttendanceTable({
  records,
  labels,
  actionLabels,
  editLabels,
  areas,
  currentDate,
  isMultiDay = false,
}: AttendanceTableProps) {
  const hasEditableRecords = records.some((r) => r.status !== "rejected");

  let headerDateDisplay: string | null = null;
  if (!isMultiDay && currentDate) {
    headerDateDisplay = dateFormatter.format(
      new Date(currentDate + "T00:00:00")
    );
  } else if (isMultiDay && records.length > 0) {
    const dates = [...new Set(records.map((r) => r.work_date))].sort();
    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    if (earliest === latest) {
      headerDateDisplay = rangeDateFormatter.format(
        new Date(earliest + "T00:00:00")
      );
    } else {
      headerDateDisplay = `${rangeDateFormatter.format(new Date(earliest + "T00:00:00"))} – ${rangeDateFormatter.format(new Date(latest + "T00:00:00"))}`;
    }
  }

  const groupedByDate: Record<string, DailyAttendanceRecord[]> = {};
  const sortedDates: string[] = [];
  if (isMultiDay) {
    for (const r of records) {
      (groupedByDate[r.work_date] ??= []).push(r);
    }
    sortedDates.push(
      ...Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))
    );
  }

  const totalHours = records.reduce((sum, r) => sum + (r.total_hours ?? 0), 0);
  const colCount = hasEditableRecords ? 5 : 4;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        {headerDateDisplay && (
          <span className="text-muted-foreground">{headerDateDisplay}</span>
        )}
      </div>

      {records.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {labels.emptyState}
        </p>
      ) : (
        <>
          {/* Mobile card view — shown on small screens only */}
          <div className="block md:hidden space-y-3">
            {isMultiDay
              ? sortedDates.map((date) => {
                  const dayRecords = groupedByDate[date];
                  const dayTotal = dayRecords.reduce(
                    (sum, r) => sum + (r.total_hours ?? 0),
                    0
                  );
                  const dayLabel = dateFormatter.format(
                    new Date(date + "T00:00:00")
                  );
                  return (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-semibold">{dayLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {labels.totalHours}: {numberFormatter.format(dayTotal)}
                        </span>
                      </div>
                      {dayRecords.map((record) => (
                        <RecordCard
                          key={record.id}
                          record={record}
                          labels={labels}
                          actionLabels={actionLabels}
                          editLabels={editLabels}
                          areas={areas}
                          hasEditableRecords={hasEditableRecords}
                        />
                      ))}
                    </div>
                  );
                })
              : records.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    labels={labels}
                    actionLabels={actionLabels}
                    editLabels={editLabels}
                    areas={areas}
                    hasEditableRecords={hasEditableRecords}
                  />
                ))}
            <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm font-medium flex items-center justify-between">
              <span>{labels.totalHours}</span>
              <span>{numberFormatter.format(totalHours)}</span>
            </div>
          </div>

          {/* Desktop table view — hidden on small screens */}
          <div
            className="hidden md:block overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(186,212,253,0.4)] bg-card shadow-md animate-fade-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-start text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground sticky top-[56px] z-20 bg-card/95 backdrop-blur-sm">
                      {labels.worker}
                    </th>
                    <th className="px-4 py-3 text-start text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground sticky top-[56px] z-20 bg-card/95 backdrop-blur-sm">
                      {labels.area}
                    </th>
                    <th className="px-4 py-3 text-start text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground sticky top-[56px] z-20 bg-card/95 backdrop-blur-sm">
                      {labels.hours}
                    </th>
                    <th className="px-4 py-3 text-start text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground sticky top-[56px] z-20 bg-card/95 backdrop-blur-sm">
                      {labels.status}
                    </th>
                    {hasEditableRecords && (
                      <th className="px-4 py-3 text-start text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground sticky top-[56px] z-20 bg-card/95 backdrop-blur-sm">
                        {labels.actions}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isMultiDay
                    ? sortedDates.map((date) => {
                        const dayRecords = groupedByDate[date];
                        const dayTotal = dayRecords.reduce(
                          (sum, r) => sum + (r.total_hours ?? 0),
                          0
                        );
                        const dayLabel = dateFormatter.format(
                          new Date(date + "T00:00:00")
                        );
                        return (
                          <Fragment key={date}>
                            <tr className="bg-muted/30">
                              <td
                                colSpan={colCount}
                                className="px-4 py-2 text-sm font-semibold"
                              >
                                {dayLabel}
                              </td>
                            </tr>
                            {dayRecords.map((record, idx) => (
                              <RecordRow
                                key={record.id}
                                record={record}
                                labels={labels}
                                actionLabels={actionLabels}
                                editLabels={editLabels}
                                areas={areas}
                                hasEditableRecords={hasEditableRecords}
                                isEven={idx % 2 === 0}
                              />
                            ))}
                            <tr className="border-t bg-muted/20 text-sm font-medium">
                              <td className="px-4 py-2">{labels.totalHours}</td>
                              <td className="px-4 py-2" />
                              <td className="px-4 py-2">
                                {numberFormatter.format(dayTotal)}
                              </td>
                              <td className="px-4 py-2" />
                              {hasEditableRecords && <td className="px-4 py-2" />}
                            </tr>
                          </Fragment>
                        );
                      })
                    : records.map((record, idx) => (
                        <RecordRow
                          key={record.id}
                          record={record}
                          labels={labels}
                          actionLabels={actionLabels}
                          editLabels={editLabels}
                          areas={areas}
                          hasEditableRecords={hasEditableRecords}
                          isEven={idx % 2 === 0}
                        />
                      ))}
                </tbody>
                <tfoot className="border-t bg-muted/50 font-medium">
                  <tr>
                    <td className="px-4 py-3">{labels.totalHours}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3">
                      {numberFormatter.format(totalHours)}
                    </td>
                    <td className="px-4 py-3" />
                    {hasEditableRecords && <td className="px-4 py-3" />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
