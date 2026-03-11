import { setRequestLocale } from "next-intl/server";
import AppSidebar from "@/components/app-sidebar";

export default async function AdminLayout({
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
      <AppSidebar locale={locale} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
