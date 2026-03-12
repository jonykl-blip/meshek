import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <p className="text-sm text-muted-foreground">
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <Image
              src="/images/meshek-logo.jpeg"
              alt="משק פילצביץ'"
              width={120}
              height={120}
              className="h-16 w-auto"
              priority
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t("title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
