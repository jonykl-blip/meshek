import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyAttendance,
  getActiveWorkers,
  getActiveAreas,
  getAnomalies,
} from "@/app/actions/attendance";
import type { AnomalyResult } from "@/app/actions/attendance";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { AttendanceFilters } from "@/components/attendance/attendance-filters";
import { AnomalyPanel } from "@/components/attendance/anomaly-panel";
import type { AnomalyPanelLabels } from "@/components/attendance/anomaly-panel";
import { routing } from "@/i18n/routing";

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
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    workerId?: string;
    areaId?: string;
  }>;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin", "manager"].includes(profile.role)) {
    redirect(`/${locale}`);
  }

  const { from, to, workerId, areaId } = await searchParams;

  const todayJerusalem = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  const fromDate = from ?? todayJerusalem;
  const toDate = to ?? todayJerusalem;
  const workerIdFilter = workerId ?? "";
  const areaIdFilter = areaId ?? "";

  const [attendanceResult, workersResult, areasResult, anomaliesResult] = await Promise.all([
    getDailyAttendance({
      fromDate,
      toDate,
      workerId: workerIdFilter || undefined,
      areaId: areaIdFilter || undefined,
    }),
    getActiveWorkers(),
    getActiveAreas(),
    getAnomalies({ fromDate, toDate }),
  ]);

  const tAttendance = await getTranslations("dashboard.attendance");
  const tFilters = await getTranslations("dashboard.filters");
  const tAnomalies = await getTranslations("dashboard.anomalies");

  const attendanceLabels = {
    title: tAttendance("title"),
    worker: tAttendance("worker"),
    area: tAttendance("area"),
    hours: tAttendance("hours"),
    status: tAttendance("status"),
    totalHours: tAttendance("totalHours"),
    emptyState: tAttendance("emptyState"),
    approved: tAttendance("approved"),
    imported: tAttendance("imported"),
    noArea: tAttendance("noArea"),
  };

  const filterLabels = {
    fromDate: tFilters("fromDate"),
    toDate: tFilters("toDate"),
    allWorkers: tFilters("allWorkers"),
    allAreas: tFilters("allAreas"),
    filterLabel: tFilters("filterLabel"),
    clearAll: tFilters("clearAll"),
    activeFilters: tFilters.raw("activeFilters") as string,
  };

  const anomalyLabels: AnomalyPanelLabels = {
    allClear: tAnomalies("allClear"),
    excessiveHoursHeading: tAnomalies("excessiveHoursHeading"),
    stalePendingHeading: tAnomalies("stalePendingHeading"),
    unknownWorker: tAnomalies("unknownWorker"),
    unknownArea: tAnomalies("unknownArea"),
  };

  const anomalyData: AnomalyResult = anomaliesResult.success
    ? anomaliesResult.data
    : { excessiveHours: [], stalePending: [] };

  const currentFilters = {
    fromDate,
    toDate,
    workerId: workerIdFilter,
    areaId: areaIdFilter,
  };

  return (
    <main className="container mx-auto p-4 md:p-6">
      <div className="space-y-4">
        <AnomalyPanel data={anomalyData} labels={anomalyLabels} />
        <AttendanceFilters
          workers={workersResult.success ? workersResult.data : []}
          areas={areasResult.success ? areasResult.data : []}
          labels={filterLabels}
          currentFilters={currentFilters}
          todayJerusalem={todayJerusalem}
        />

        {!attendanceResult.success ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            {tAttendance("loadError")}
          </div>
        ) : (
          <AttendanceTable
            records={attendanceResult.data}
            labels={attendanceLabels}
            currentDate={fromDate !== toDate ? undefined : fromDate}
            isMultiDay={fromDate !== toDate}
          />
        )}
      </div>
    </main>
  );
}
