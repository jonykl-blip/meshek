import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSidebarKpis } from "@/app/actions/sidebar";
import { getInitials } from "@/lib/format";
import AppSidebar from "@/components/app-sidebar";
import AppTopBar from "@/components/app-topbar";

export default async function AdminLayout({
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

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    userInitials = getInitials(profile?.full_name ?? "");

    try {
      const kpis = await getSidebarKpis(supabase);
      pendingCount = kpis.pendingCount;
    } catch {
      // KPIs are non-critical for topbar rendering
    }
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <AppTopBar userInitials={userInitials} notificationCount={pendingCount} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
