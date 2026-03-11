import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  Banknote,
  CalendarCheck,
  ClipboardList,
  MapPin,
  Users,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("heroTitle") };
}

const navSections = [
  {
    sectionKey: "management" as const,
    cards: [
      { titleKey: "workers", descKey: "workersDesc", icon: Users, href: "/admin/workers" },
      { titleKey: "areas", descKey: "areasDesc", icon: MapPin, href: "/admin/areas" },
      { titleKey: "equipment", descKey: "equipmentDesc", icon: Wrench, href: "/admin/equipment" },
    ],
  },
  {
    sectionKey: "finance" as const,
    cards: [
      { titleKey: "payroll", descKey: "payrollDesc", icon: Banknote, href: "/admin/payroll" },
    ],
  },
  {
    sectionKey: "reportsOps" as const,
    cards: [
      { titleKey: "dashboard", descKey: "dashboardDesc", icon: CalendarCheck, href: "/dashboard" },
      { titleKey: "review", descKey: "reviewDesc", icon: ClipboardList, href: "/admin/review" },
    ],
  },
] as const;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="w-full border-b border-b-foreground/10 h-16">
        <div className="max-w-5xl mx-auto flex justify-between items-center h-full px-5">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <Image
              src="/images/meshek-logo.jpeg"
              alt={tCommon("appName")}
              width={32}
              height={32}
              className="h-8 w-auto mix-blend-multiply brightness-110"
              priority
            />
            {tCommon("appName")}
          </Link>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-5 py-12">
        <div className="max-w-5xl w-full flex flex-col items-center gap-12">
          <section className="flex flex-col items-center gap-4 text-center">
            <Image
              src="/images/meshek-logo.jpeg"
              alt={tCommon("appName")}
              width={225}
              height={225}
              className="h-24 w-auto mix-blend-multiply brightness-110"
              priority
            />
            <h1 className="text-3xl font-bold">{t("heroTitle")}</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              {t("heroDescription")}
            </p>
            {!user && (
              <Button asChild size="lg" className="mt-2">
                <Link href="/auth/login">{t("signInCta")}</Link>
              </Button>
            )}
          </section>

          <div className="w-full flex flex-col gap-8">
            {navSections.map((section) => (
              <section key={section.sectionKey}>
                <h2 className="text-xl font-semibold mb-4 text-start">
                  {t(`sections.${section.sectionKey}`)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.cards.map((card) => (
                    <Link key={card.titleKey} href={card.href}>
                      <Card className="hover:border-foreground/20 transition-colors h-full">
                        <CardHeader className="flex flex-row items-center gap-3">
                          <card.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <CardTitle className="text-base">
                              {t(`nav.${card.titleKey}`)}
                            </CardTitle>
                            <CardDescription>
                              {t(`nav.${card.descKey}`)}
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full flex items-center justify-center border-t text-center text-xs py-8">
        <ThemeSwitcher />
      </footer>
    </div>
  );
}
