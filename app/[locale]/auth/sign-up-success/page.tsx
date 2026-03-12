import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth.signUpSuccess");
  const tAuth = await getTranslations("auth");
  return (
    <div className="auth-section">
      <div className="auth-card">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/meshek-logo.jpeg"
            alt="משק פילצביץ'"
            width={120}
            height={120}
            className="h-16 w-auto mix-blend-multiply brightness-110"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">{t("title")}</h1>
        <p className="text-sm text-muted-foreground text-center mb-4">{t("description")}</p>
        <p className="text-sm text-muted-foreground text-center mb-6">{t("content")}</p>
        <Link
          href="/auth/login"
          className="block h-[50px] w-full rounded-md bg-gradient-to-br from-primary to-[#4A6526] text-center text-base font-semibold text-primary-foreground leading-[50px] shadow-[0_4px_16px_rgba(91,122,47,0.25)] hover:from-[#4A6526] hover:to-[#3A5420] hover:shadow-[0_6px_24px_rgba(91,122,47,0.35)]"
        >
          {tAuth("loginTitle")}
        </Link>
      </div>
    </div>
  );
}
