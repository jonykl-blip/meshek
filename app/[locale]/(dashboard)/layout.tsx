import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSidebarKpis } from "@/app/actions/sidebar";
import { getInitials } from "@/lib/format";
import AppSidebar from "@/components/app-sidebar";
import AppTopBar from "@/components/app-topbar";
import PullToRefresh from "@/components/pull-to-refresh";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userInitials = "";
  let pendingCount = 0;
  let role = "";
  let fullName = "";
  let kpis = { pendingCount: 0, approvedToday: 0, anomalyCount: 0 };

  if (user) {
    const [profileResult, kpisResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single(),
      getSidebarKpis(supabase).catch(() => kpis),
    ]);

    fullName = profileResult.data?.full_name ?? "";
    role = profileResult.data?.role ?? "";
    userInitials = getInitials(fullName);
    kpis = kpisResult;
    pendingCount = kpis.pendingCount;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={role} fullName={fullName} kpis={kpis} />
      <div className="flex flex-1 flex-col overflow-auto">
        <AppTopBar userInitials={userInitials} notificationCount={pendingCount} />
        <PullToRefresh />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
