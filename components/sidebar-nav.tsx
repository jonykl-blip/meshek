"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ClipboardList,
  CalendarCheck,
  Banknote,
  Users,
  MapPin,
  Wrench,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string | null;
  roles: string[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "תור ביקורת",
    icon: ClipboardList,
    href: "/admin/review",
    roles: ["owner", "admin"],
  },
  {
    label: "נוכחות",
    icon: CalendarCheck,
    href: "/dashboard",
    roles: ["owner", "admin", "manager"],
  },
  {
    label: "שכר",
    icon: Banknote,
    href: "/admin/payroll",
    roles: ["owner", "admin"],
  },
  {
    label: "עובדים",
    icon: Users,
    href: "/admin/workers",
    roles: ["owner", "admin"],
  },
  {
    label: "שטחים",
    icon: MapPin,
    href: "/admin/areas",
    roles: ["owner", "admin"],
  },
  {
    label: "ציוד",
    icon: Wrench,
    href: "/admin/equipment",
    roles: ["owner", "admin"],
  },
];

interface SidebarNavProps {
  role: string;
  kpis: { pendingCount: number; approvedToday: number; anomalyCount: number };
}

export default function SidebarNav({ role, kpis }: SidebarNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("meshek-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("meshek-sidebar-collapsed", String(next));
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={`flex flex-col min-h-screen bg-[#3D5834] text-white transition-all duration-200 ${
        collapsed ? "w-[48px]" : "w-[200px]"
      }`}
    >
      {/* Logo / brand */}
      <div className="flex items-center justify-center h-14 border-b border-white/10">
        {collapsed ? (
          <span className="text-lg font-bold">מ</span>
        ) : (
          <span className="text-base font-bold px-4">מֶשֶׁק</span>
        )}
      </div>

      {/* KPI block */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/10 text-xs space-y-1">
          <div className="text-amber-300">
            ממתינים: {kpis.pendingCount}
          </div>
          <div className="text-green-300">
            אושרו היום: {kpis.approvedToday}
          </div>
          {kpis.anomalyCount > 0 && (
            <div className="text-red-400">
              חריגות: {kpis.anomalyCount}
            </div>
          )}
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-2">
        {visibleItems.map((item) => {
          const isActive = item.href
            ? pathname.startsWith(item.href)
            : false;
          const Icon = item.icon;

          const itemClasses = [
            "flex items-center gap-3 px-3 py-2.5 w-full text-start transition-colors",
            isActive
              ? "border-r-2 border-white font-semibold bg-white/10"
              : "hover:bg-white/10",
            item.disabled
              ? "opacity-50 pointer-events-none cursor-not-allowed"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = item.disabled ? (
            <span className={itemClasses}>
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </span>
          ) : (
            <Link href={item.href!} className={itemClasses}>
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.label} delayDuration={100}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.label}>{content}</div>;
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-center h-10 border-t border-white/10 hover:bg-white/10 transition-colors"
        aria-label={collapsed ? "הרחב תפריט" : "כווץ תפריט"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
