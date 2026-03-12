"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Download } from "lucide-react";
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
import { exportPayrollCsv } from "@/app/actions/payroll";

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
  exportError: string;
  exporting: string;
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
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    setOpen(false);
    setExportError(null);
    startTransition(async () => {
      const result = await exportPayrollCsv({ fromDate, toDate });
      if (!result.success) {
        setExportError(result.error);
        return;
      }
      // Trigger browser download
      const blob = new Blob([result.data.csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        disabled={isPending}
      >
        <Download className="h-4 w-4" />
        {isPending ? labels.exporting : labels.exportCsv}
      </Button>

      {exportError && (
        <p className="text-sm text-destructive text-start mt-2">
          {labels.exportError}: {exportError}
        </p>
      )}

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
            <Button onClick={handleExport} disabled={isPending}>
              {labels.exportGateConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
