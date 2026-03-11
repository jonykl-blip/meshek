import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import type { DailyAttendanceRecord } from "@/app/actions/attendance";

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
}

interface AttendanceTableProps {
  records: DailyAttendanceRecord[];
  labels: AttendanceTableLabels;
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

export function AttendanceTable({
  records,
  labels,
  currentDate,
  isMultiDay = false,
}: AttendanceTableProps) {
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

  const totalHours = records.reduce((sum, r) => sum + r.total_hours, 0);

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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">
                  {labels.worker}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {labels.area}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {labels.hours}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {labels.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {isMultiDay
                ? sortedDates.map((date) => {
                    const dayRecords = groupedByDate[date];
                    const dayTotal = dayRecords.reduce(
                      (sum, r) => sum + r.total_hours,
                      0
                    );
                    const dayLabel = dateFormatter.format(
                      new Date(date + "T00:00:00")
                    );
                    return (
                      <Fragment key={date}>
                        <tr className="bg-muted/30">
                          <td
                            colSpan={4}
                            className="px-4 py-2 text-sm font-semibold"
                          >
                            {dayLabel}
                          </td>
                        </tr>
                        {dayRecords.map((record) => (
                          <tr key={record.id} className="border-b">
                            <td className="px-4 py-3">{record.worker_name}</td>
                            <td className="px-4 py-3">
                              {record.area_name ?? labels.noArea}
                            </td>
                            <td className="px-4 py-3">
                              {numberFormatter.format(record.total_hours)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  record.status === "approved"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  record.status === "approved"
                                    ? "bg-[#4A6741] hover:bg-[#4A6741]/80"
                                    : ""
                                }
                              >
                                {record.status === "approved"
                                  ? labels.approved
                                  : labels.imported}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/20 text-sm font-medium">
                          <td className="px-4 py-2">{labels.totalHours}</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2">
                            {numberFormatter.format(dayTotal)}
                          </td>
                          <td className="px-4 py-2" />
                        </tr>
                      </Fragment>
                    );
                  })
                : records.map((record) => (
                    <tr key={record.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{record.worker_name}</td>
                      <td className="px-4 py-3">
                        {record.area_name ?? labels.noArea}
                      </td>
                      <td className="px-4 py-3">
                        {numberFormatter.format(record.total_hours)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            record.status === "approved"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            record.status === "approved"
                              ? "bg-[#4A6741] hover:bg-[#4A6741]/80"
                              : ""
                          }
                        >
                          {record.status === "approved"
                            ? labels.approved
                            : labels.imported}
                        </Badge>
                      </td>
                    </tr>
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
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
