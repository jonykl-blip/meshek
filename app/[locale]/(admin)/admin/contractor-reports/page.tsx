import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClients } from "@/app/actions/clients";
import { getWorkTypes } from "@/app/actions/work-types";
import { OperationsDashboard, type DashboardLabels } from "./operations-dashboard";

export function generateStaticParams() {
  return [{ locale: "he" }, { locale: "th" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.contractorReports");
  return { title: t("title") };
}

export default async function ContractorReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.contractorReports");

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
    redirect(`/${locale}/dashboard`);
  }

  const [allClients, workTypes] = await Promise.all([getClients(), getWorkTypes()]);

  const labels: DashboardLabels = {
    fromDate: t("fromDate"),
    toDate: t("toDate"),
    currentMonth: t("currentMonth"),
    previousMonth: t("previousMonth"),
    allClients: t("allClients"),
    exportCsv: t("exportCsv"),
    exporting: t("exporting"),
    exportError: t("exportError"),
    noData: t("noData"),
    totalHours: t("totalHours"),
    totalDunam: t("totalDunam"),
    sessionCount: t("sessionCount"),
    activeClients: t("activeClients"),
    laborIntensity: t("laborIntensity"),
    avgCrewSize: t("avgCrewSize"),
    hoursPerDunam: t("hoursPerDunam"),
    workersPerSession: t("workersPerSession"),
    byClient: t("byClient"),
    byWorkType: t("byWorkType"),
    hours: t("hours"),
    dunam: t("dunam"),
    sessions: t("sessions"),
    date: t("date"),
    client: t("client"),
    area: t("area"),
    workType: t("workType"),
    materials: t("materials"),
    materialQty: t("materialQty"),
    workers: t("workers"),
    workerCount: t("workerCount"),
    notes: t("notes"),
    previewCount: t("previewCount"),
    workSummary: t("workSummary"),
    groupByClient: t("groupByClient"),
    groupByDate: t("groupByDate"),
    workSummaryByDate: t("workSummaryByDate"),
    loadData: t("loadData"),
    loading: t("loading"),
    scopeAll: t("scopeAll"),
    scopeContractor: t("scopeContractor"),
    scopeOwnFarm: t("scopeOwnFarm"),
    allWorkTypes: t("allWorkTypes"),
    byClientHours: t("byClientHours"),
    byClientDunam: t("byClientDunam"),
    dailyActivity: t("dailyActivity"),
    workTypeByHours: t("workTypeByHours"),
    materialUsage: t("materialUsage"),
    workerHours: t("workerHours"),
    filterActive: t("filterActive"),
    clearFilter: t("clearFilter"),
  };

  return (
    <main className="w-full p-4 lg:p-6">
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <OperationsDashboard
        clients={allClients.map((c) => ({ id: c.id, name: c.name }))}
        workTypes={workTypes.map((wt) => ({ id: wt.id, name_he: wt.name_he }))}
        labels={labels}
      />
    </main>
  );
}
