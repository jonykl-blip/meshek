import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getPayrollAggregation, getPayrollAnomalies, type AnomalyRecord } from "@/app/actions/payroll";
import { PayrollTable } from "@/components/payroll/payroll-table";
import { PayrollFilters } from "@/components/payroll/payroll-filters";
import { PayrollExportGate, type ExportGateLabels } from "@/components/payroll/payroll-export-gate";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.payroll");
  return { title: t("title") };
}

export default async function PayrollPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
    redirect(`/${locale}`);
  }

  const { from, to } = await searchParams;

  const todayJerusalem = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  const firstOfMonth = todayJerusalem.slice(0, 8) + "01";
  const fromDate = from ?? firstOfMonth;
  const toDate = to ?? todayJerusalem;

  const result = await getPayrollAggregation({ fromDate, toDate });
  const anomalyResult = await getPayrollAnomalies({ fromDate, toDate });
  const anomalies: AnomalyRecord[] = anomalyResult.success ? anomalyResult.data : [];

  const t = await getTranslations("admin.payroll");

  const payrollTableLabels = {
    worker: t("worker"),
    totalHours: t("totalHours"),
    hourlyRate: t("hourlyRate"),
    grossPay: t("grossPay"),
    grandTotal: t("grandTotal"),
    emptyState: t("emptyState"),
    missingRate: t("missingRate"),
    recordCount: t("recordCount"),
    missingRateWarning: t("missingRateWarning"),
  };

  const payrollFilterLabels = {
    fromDate: t("fromDate"),
    toDate: t("toDate"),
    currentMonth: t("currentMonth"),
    previousMonth: t("previousMonth"),
  };

  const exportGateLabels: ExportGateLabels = {
    exportCsv: t("exportCsv"),
    exportGateTitle: t("exportGateTitle"),
    exportGateDesc: t("exportGateDesc"),
    exportGateConfirm: t("exportGateConfirm"),
    exportGateCancel: t("exportGateCancel"),
    exportGateEdit: t("exportGateEdit"),
    exportGateWorker: t("exportGateWorker"),
    exportGateDate: t("exportGateDate"),
    exportGateArea: t("exportGateArea"),
    exportGateHours: t("exportGateHours"),
    exportError: t("exportError"),
    exporting: t("exporting"),
  };

  return (
    <main className="container mx-auto p-4 md:p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        <PayrollFilters
          labels={payrollFilterLabels}
          currentFilters={{ fromDate, toDate }}
          todayJerusalem={todayJerusalem}
        />

        {result.success ? (
          <PayrollTable data={result.data} labels={payrollTableLabels} />
        ) : (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            <p className="font-medium">{t("loadError")}</p>
            <p className="text-sm">{result.error}</p>
          </div>
        )}

        <PayrollExportGate
          anomalies={anomalies}
          labels={exportGateLabels}
          fromDate={fromDate}
          toDate={toDate}
        />
      </div>
    </main>
  );
}
