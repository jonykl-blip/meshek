"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getInitials } from "@/lib/format";
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
  Wheat,
  Home,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string | null;
  roles: string[];
  disabled?: boolean;
  exact?: boolean;
}

interface NavSection {
  labelKey: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    labelKey: "reportsOps",
    items: [
      { label: "ניהול מערכת", icon: Home, href: "/admin", roles: ["owner", "admin"], exact: true },
      { label: "נוכחות", icon: CalendarCheck, href: "/dashboard", roles: ["owner", "admin", "manager"] },
      { label: "רשומות ממתינות לאישור", icon: ClipboardList, href: "/admin/review", roles: ["owner", "admin"] },
    ],
  },
  {
    labelKey: "management",
    items: [
      { label: "עובדים", icon: Users, href: "/admin/workers", roles: ["owner", "admin"] },
      { label: "שטחים", icon: MapPin, href: "/admin/areas", roles: ["owner", "admin"] },
      { label: "ציוד", icon: Wrench, href: "/admin/equipment", roles: ["owner", "admin"] },
      { label: "גידולים", icon: Wheat, href: "/admin/crops", roles: ["owner", "admin"] },
    ],
  },
  {
    labelKey: "finance",
    items: [
      { label: "שכר", icon: Banknote, href: "/admin/payroll", roles: ["owner", "admin"] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "בעלים",
  admin: "מנהל",
  manager: "מנהל משמרת",
  worker: "עובד",
};

interface SidebarNavProps {
  role: string;
  fullName: string;
  kpis: { pendingCount: number; approvedToday: number; anomalyCount: number };
}

export default function SidebarNav({ role, fullName, kpis }: SidebarNavProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("meshek-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("meshek-sidebar-collapsed", String(next));
  }

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContent = (
    <>
      {/* Logo / brand */}
      <div className="relative z-[1] flex flex-col items-center pt-7 pb-4 px-5">
        <Link href="/">
          {collapsed ? (
            <span className="text-lg font-bold">{tCommon("appName").charAt(0)}</span>
          ) : (
            <>
              <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center overflow-hidden mx-auto"
                style={{
                  background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.95), rgba(237,232,224,0.9))",
                  border: "2.5px solid rgba(107,140,62,0.6)",
                  boxShadow: "0 3px 16px rgba(0,0,0,0.2)",
                }}
              >
                <Image
                  src="/images/meshek-logo.jpeg"
                  alt="משק פילצביץ'"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain rounded-full"
                  priority
                />
              </div>
              <p className="text-[0.9rem] font-bold text-white/95 text-center mt-2">{tCommon("brandName")}</p>
            </>
          )}
        </Link>
        {!collapsed && (
          <div className="w-4/5 h-px bg-white/10 mt-3" />
        )}
      </div>

      {/* User avatar section */}
      {!collapsed && fullName && (
        <div className="relative z-[1] flex items-center gap-3 px-5 py-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent)), #c56a2e)",
              boxShadow: "0 2px 8px rgba(217,121,58,0.3)",
            }}
          >
            {getInitials(fullName)}
          </div>
          <div className="min-w-0">
            <p className="text-[0.85rem] font-semibold text-white leading-tight truncate">
              {fullName}
            </p>
            <span
              className="inline-block text-[0.65rem] font-semibold px-2 py-px rounded-full mt-0.5 tracking-wide"
              style={{
                background: "rgba(217,121,58,0.25)",
                color: "#F0C070",
              }}
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
        </div>
      )}

      {/* KPI pills */}
      {!collapsed && (
        <div className="relative z-[1] px-4 pb-4 flex flex-col gap-[5px]">
          <div className="sidebar-kpi-pill">
            <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#E6A817]" />
            <span className="text-[#F0C654]">{t("kpi.pending", { count: kpis.pendingCount })}</span>
          </div>
          <div className="sidebar-kpi-pill">
            <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#5DB075]" />
            <span className="text-[#8DD9A0]">{t("kpi.approvedToday", { count: kpis.approvedToday })}</span>
          </div>
          {kpis.anomalyCount > 0 && (
            <div className="sidebar-kpi-pill">
              <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#E05C4D]" />
              <span className="text-[#F08C7F]">{t("kpi.anomalies", { count: kpis.anomalyCount })}</span>
            </div>
          )}
        </div>
      )}

      {/* Nav links */}
      <nav className="relative z-[1] flex-1 py-0 px-3 overflow-y-auto">
        {visibleSections.map((section, sectionIdx) => {
          const sectionLabelId = `nav-section-${section.labelKey}`;

          return (
            <div
              key={section.labelKey}
              role="group"
              aria-labelledby={collapsed ? undefined : sectionLabelId}
              className={sectionIdx > 0 ? (collapsed ? "mt-2 border-t border-white/10 pt-2" : "mt-[18px]") : ""}
            >
              {!collapsed && (
                <span
                  id={sectionLabelId}
                  className="block px-3 pb-[5px] text-[0.62rem] font-semibold uppercase tracking-[2px] text-white/35"
                >
                  {t(`sections.${section.labelKey}`)}
                </span>
              )}
              {section.items.map((item) => {
                const isActive = item.href
                  ? item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                  : false;
                const Icon = item.icon;

                const itemClasses = [
                  "relative flex items-center gap-[10px] w-full text-start transition-all duration-200",
                  collapsed ? "px-3 py-2.5" : "px-3 py-[9px] rounded-[10px]",
                  isActive
                    ? "bg-white/[0.13] text-white border-s-[3px] font-semibold"
                    : "text-white/65 hover:bg-white/[0.08] hover:text-white border-s-[3px] border-transparent",
                  item.disabled
                    ? "opacity-50 pointer-events-none cursor-not-allowed"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const content = item.disabled ? (
                  <span className={itemClasses}>
                    <Icon size={20} className="shrink-0" />
                    {!collapsed && (
                      <span className="text-[0.84rem] font-medium truncate">{item.label}</span>
                    )}
                  </span>
                ) : (
                  <Link href={item.href!} className={itemClasses}
                    style={{
                      borderInlineStartColor: isActive ? "hsl(var(--accent))" : "transparent",
                    }}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!collapsed && (
                      <span className="text-[0.84rem] font-medium truncate">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span
                        className="absolute left-3 w-[6px] h-[6px] rounded-full"
                        style={{
                          background: "hsl(var(--accent))",
                          boxShadow: "0 0 8px rgba(217,121,58,0.5)",
                        }}
                      />
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
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="relative z-[1] px-5 py-4 border-t border-white/[0.08]">
          <span className="flex items-center gap-2 text-[0.8rem] text-white/50 hover:text-white/80 transition-colors cursor-pointer">
            <HelpCircle size={16} className="shrink-0" />
            {t("footer.help")}
          </span>
        </div>
      )}

      {/* Collapse toggle — desktop only */}
      <button
        onClick={toggleCollapsed}
        className="relative z-[1] hidden md:flex items-center justify-center h-10 border-t border-white/10 hover:bg-white/10 transition-colors"
        aria-label={collapsed ? "הרחב תפריט" : "כווץ תפריט"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile hamburger toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--sidebar-top)] text-white shadow-md"
        aria-label="פתח תפריט"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`sidebar-noise fixed inset-y-0 left-0 z-50 flex flex-col w-[260px] text-white transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, var(--sidebar-top) 0%, var(--sidebar-bottom) 100%)",
        }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 z-[2] flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
          aria-label="סגור תפריט"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`sidebar-noise relative hidden md:flex flex-col min-h-screen text-white transition-all duration-200 ${
          collapsed ? "w-[48px]" : "w-[260px]"
        }`}
        style={{
          background: "linear-gradient(180deg, var(--sidebar-top) 0%, var(--sidebar-bottom) 100%)",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
