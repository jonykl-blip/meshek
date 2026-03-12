import { AuthButton } from "@/components/auth-button";
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
  Wheat,
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
      { titleKey: "crops", descKey: "cropsDesc", icon: Wheat, href: "/admin/crops" },
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
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-[hsl(var(--card))]/80 border-b border-[hsl(var(--border))]/50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center h-16 px-5">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
              <Image
                src="/images/meshek-logo.jpeg"
                alt={tCommon("appName")}
                width={32}
                height={32}
                className="h-7 w-7 rounded-full object-cover mix-blend-multiply brightness-110"
              />
            </div>
            {tCommon("appName")}
          </Link>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full bg-gradient-to-b from-[#F8F5F0] via-[#EDE8E0] to-[#F8F5F0] py-16 md:py-20">
          <div className="max-w-5xl mx-auto flex flex-col items-center gap-5 px-5 text-center">
            <div className="relative">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#FFFDF9] to-[#F0EBE2] border-[3px] border-[hsl(var(--primary))]/40 flex items-center justify-center shadow-lg animate-[logoGlow_4s_ease-in-out_infinite]">
                <Image
                  src="/images/meshek-logo.jpeg"
                  alt={tCommon("appName")}
                  width={225}
                  height={225}
                  className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("heroTitle")}</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              {t("heroDescription")}
            </p>
            {!user && (
              <Button
                asChild
                size="lg"
                className="auth-btn-primary mt-2 w-auto px-8"
              >
                <Link href="/auth/login">{t("signInCta")}</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Feature cards */}
        <div className="max-w-5xl w-full flex flex-col gap-10 px-5 py-12">
          {navSections.map((section) => (
            <section key={section.sectionKey}>
              <h2 className="text-xl font-semibold mb-4 text-start flex items-center gap-3">
                <span className="w-1 h-6 rounded-full bg-primary" />
                {t(`sections.${section.sectionKey}`)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.cards.map((card) => (
                  <Link key={card.titleKey} href={card.href}>
                    <Card className="shadow-md rounded-lg border bg-card hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 h-full">
                      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                        <card.icon className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <CardTitle className="text-base font-bold">
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
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[hsl(var(--border))]/50 py-6">
        <p className="text-center text-xs text-muted-foreground">
          {tCommon("copyright", { year: new Date().getFullYear().toString() })}
        </p>
      </footer>
    </div>
  );
}
