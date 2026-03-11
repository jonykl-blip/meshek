"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnomalyRecord } from "@/app/actions/payroll";

export interface ExportGateLabels {
  exportCsv: string;
  exportGateTitle: string;
  exportGateDesc: string;
  exportGateConfirm: string;
  exportGateCancel: string;
  exportGateEdit: string;
  exportGateWorker: string;
  exportGateDate: string;
  exportGateArea: string;
  exportGateHours: string;
}

interface PayrollExportGateProps {
  anomalies: AnomalyRecord[];
  labels: ExportGateLabels;
  fromDate: string;
  toDate: string;
}

export function PayrollExportGate({
  anomalies,
  labels,
  fromDate,
  toDate,
}: PayrollExportGateProps) {
  const [open, setOpen] = useState(false);

  function handleExport() {
    setOpen(false);
    // Story 5.3 will replace this with actual CSV download
    console.log("CSV export stub — Story 5.3 will implement download", {
      fromDate,
      toDate,
    });
  }

  return (
    <>
      <Button
        onClick={() => {
          if (anomalies.length === 0) {
            handleExport();
          } else {
            setOpen(true);
          }
        }}
        variant="default"
      >
        {labels.exportCsv}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{labels.exportGateTitle}</DialogTitle>
            <DialogDescription>{labels.exportGateDesc}</DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">
                    {labels.exportGateWorker}
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {labels.exportGateDate}
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {labels.exportGateArea}
                  </th>
                  <th className="px-3 py-2 text-start font-medium">
                    {labels.exportGateHours}
                  </th>
                  <th className="px-3 py-2 text-start font-medium" />
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-start">{a.worker_name}</td>
                    <td className="px-3 py-2 text-start">
                      {new Date(a.work_date + "T00:00:00").toLocaleDateString(
                        "he-IL",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          timeZone: "Asia/Jerusalem",
                        }
                      )}
                    </td>
                    <td className="px-3 py-2 text-start">{a.area_name}</td>
                    <td className="px-3 py-2 text-start font-medium text-amber-600">
                      {a.total_hours.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-start">
                      <Link
                        href={`/admin/review?from=${a.work_date}&to=${a.work_date}`}
                        className="text-sm text-blue-600 underline hover:text-blue-800"
                        onClick={() => setOpen(false)}
                      >
                        {labels.exportGateEdit}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {labels.exportGateCancel}
            </Button>
            <Button onClick={handleExport}>{labels.exportGateConfirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
