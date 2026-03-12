import { createClient } from "@/lib/supabase/server";
import { getSidebarKpis } from "@/app/actions/sidebar";
import SidebarNav from "./sidebar-nav";

export default async function AppSidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[AppSidebar] Failed to fetch profile:", profileError.message);
    return null;
  }

  if (!profile) return null;

  let kpis = { pendingCount: 0, approvedToday: 0, anomalyCount: 0 };
  try {
    kpis = await getSidebarKpis(supabase);
  } catch (err) {
    console.error("[AppSidebar] Failed to fetch KPIs:", err);
  }

  return (
    <SidebarNav
      role={profile.role}
      fullName={profile.full_name ?? ""}
      kpis={kpis}
    />
  );
}
