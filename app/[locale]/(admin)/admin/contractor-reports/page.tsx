import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClients } from "@/app/actions/clients";
import { ContractorReportsView } from "./contractor-reports-view";

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

  const clients = await getClients();
  const contractorClients = clients.filter((c) => !c.is_own_farm);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <ContractorReportsView
        clients={contractorClients.map((c) => ({ id: c.id, name: c.name }))}
        labels={{
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
          workers: t("workers"),
          workerCount: t("workerCount"),
          notes: t("notes"),
          previewCount: t("previewCount"),
          workSummary: t("workSummary"),
        }}
      />
    </main>
  );
}
