import SidebarNav from "./sidebar-nav";

interface AppSidebarProps {
  role: string;
  fullName: string;
  kpis: { pendingCount: number; approvedToday: number; anomalyCount: number };
}

export default function AppSidebar({ role, fullName, kpis }: AppSidebarProps) {
  return (
    <SidebarNav
      role={role}
      fullName={fullName}
      kpis={kpis}
    />
  );
}
