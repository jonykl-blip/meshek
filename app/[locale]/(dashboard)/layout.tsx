import { setRequestLocale } from "next-intl/server";
import AppSidebar from "@/components/app-sidebar";
import AppTopBar from "@/components/app-topbar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <AppTopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
