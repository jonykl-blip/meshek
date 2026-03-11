import type { PayrollSummary } from "@/app/actions/payroll";

export interface PayrollTableLabels {
  worker: string;
  totalHours: string;
  hourlyRate: string;
  grossPay: string;
  grandTotal: string;
  emptyState: string;
  missingRate: string;
  recordCount: string;
  missingRateWarning: string;
}

const currencyFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
});

export function PayrollTable({
  data,
  labels,
}: {
  data: PayrollSummary;
  labels: PayrollTableLabels;
}) {
  if (data.rows.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center text-green-800">
        {labels.emptyState}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-start font-medium">
                {labels.worker}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {labels.recordCount}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {labels.totalHours}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {labels.hourlyRate}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {labels.grossPay}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.profile_id} className="border-b last:border-b-0">
                <td className="px-4 py-3 text-start font-medium">
                  {row.worker_name}
                </td>
                <td className="px-4 py-3 text-start">{row.record_count}</td>
                <td className="px-4 py-3 text-start">
                  {row.total_hours.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-start">
                  {row.hourly_rate != null ? (
                    currencyFormatter.format(row.hourly_rate)
                  ) : (
                    <span className="text-amber-600">{labels.missingRate}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-start">
                  {row.gross_pay != null
                    ? currencyFormatter.format(row.gross_pay)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-semibold">
            <tr>
              <td className="px-4 py-3 text-start" colSpan={2}>
                {labels.grandTotal}
              </td>
              <td className="px-4 py-3 text-start">
                {data.total_hours.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-start" />
              <td className="px-4 py-3 text-start">
                {currencyFormatter.format(data.total_gross_pay)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {data.has_missing_rates && (
        <p className="text-sm text-amber-600">{labels.missingRateWarning}</p>
      )}
    </div>
  );
}
