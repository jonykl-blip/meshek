import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAttendanceHealthMetrics, getStaleListStatus } from "@/app/actions/health-metrics";
import { HealthPanel } from "./health-panel";

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
  const t = await getTranslations("admin");
  return { title: t("title") };
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
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
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("admin");
  const healthT = await getTranslations("admin.health");

  const [metricsResult, staleResult] = await Promise.all([
    getAttendanceHealthMetrics(),
    getStaleListStatus(),
  ]);

  const hasError = !metricsResult.success || !staleResult.success;

  const metrics = metricsResult.success
    ? metricsResult.data
    : { totalRecords: 0, pendingCount: 0, unmatchedRate: 0 };

  const stale = staleResult.success
    ? staleResult.data
    : { workersLastUpdated: null, areasLastUpdated: null, isStale: false };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      {hasError && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-medium">{healthT("loadError")}</p>
        </div>
      )}
      <HealthPanel
        totalRecords={metrics.totalRecords}
        pendingCount={metrics.pendingCount}
        unmatchedRate={metrics.unmatchedRate}
        isStale={stale.isStale}
        workersLastUpdated={stale.workersLastUpdated}
        areasLastUpdated={stale.areasLastUpdated}
        labels={{
          title: healthT("title"),
          totalRecords: healthT("totalRecords"),
          pendingRecords: healthT("pendingRecords"),
          unmatchedRate: healthT("unmatchedRate"),
          unmatchedRateHigh: healthT("unmatchedRateHigh"),
          staleAlert: healthT("staleAlert"),
          workersLastUpdated: healthT("workersLastUpdated"),
          areasLastUpdated: healthT("areasLastUpdated"),
          noRecordsThisMonth: healthT("noRecordsThisMonth"),
          daysAgo: healthT("daysAgo"),
        }}
      />
    </main>
  );
}
