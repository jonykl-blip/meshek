"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronDown } from "lucide-react";

interface TopBarProps {
  userInitials: string;
  notificationCount: number;
}

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  dashboard: "dashboard",
  admin: "admin",
  workers: "workers",
  areas: "areas",
  equipment: "equipment",
  crops: "crops",
  payroll: "payroll",
  review: "review",
  health: "health",
};

function getPageKey(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  // Last meaningful segment determines the page
  for (let i = segments.length - 1; i >= 0; i--) {
    const key = ROUTE_TO_PAGE_KEY[segments[i]];
    if (key) return key;
  }
  return null;
}

export default function TopBar({ userInitials, notificationCount }: TopBarProps) {
  const pathname = usePathname();
  const t = useTranslations("topbar");

  const pageKey = getPageKey(pathname);
  const pageName = pageKey ? t(`pages.${pageKey}`) : null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-[rgba(255,253,249,0.85)] px-4 backdrop-blur-md md:px-8">
      {/* Breadcrumbs */}
      <nav className="flex-shrink-0 text-[0.82rem] text-muted-foreground">
        <Link href="/" className="hover:text-primary">{t("home")}</Link>
        {pageName && (
          <>
            <span className="mx-1.5 opacity-50">{t("breadcrumbSep")}</span>
            <span className="font-semibold text-foreground">{pageName}</span>
          </>
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label={t("notifications")}
      >
        <Bell className="h-[1.1rem] w-[1.1rem]" />
        {notificationCount > 0 && (
          <span className="absolute end-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-[#E05C4D] text-[0.6rem] font-bold text-white">
            {notificationCount > 99 ? "99" : notificationCount}
          </span>
        )}
      </button>

      {/* User avatar + dropdown arrow */}
      <button
        type="button"
        className="flex items-center gap-2 rounded-[var(--radius-sm)] py-1 pe-2 ps-1 transition-colors hover:bg-secondary"
        aria-label={t("userMenu")}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#c56a2e] text-[0.8rem] font-bold text-white">
          {userInitials}
        </div>
        <ChevronDown className="h-[0.65rem] w-[0.65rem] text-muted-foreground" />
      </button>
    </header>
  );
}
