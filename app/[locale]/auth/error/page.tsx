import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Suspense } from "react";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const ERROR_KEYS = [
  "no_user",
  "no_profile",
  "worker_not_allowed",
  "auth_failed",
  "invalid_link",
] as const;

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const [params, t] = await Promise.all([
    searchParams,
    getTranslations("auth.error"),
  ]);

  const code = params?.error;
  const hasKnownCode = ERROR_KEYS.includes(code as (typeof ERROR_KEYS)[number]);

  return (
    <p className="text-sm text-muted-foreground text-center">
      {hasKnownCode ? t(code as (typeof ERROR_KEYS)[number]) : t("unspecified")}
    </p>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth.error");
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
        <h1 className="text-2xl font-bold text-center mb-4">{t("title")}</h1>
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
