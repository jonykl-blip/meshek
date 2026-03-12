import { LoginForm } from "@/components/login-form";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Suspense } from "react";
import Image from "next/image";

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
  const t = await getTranslations("auth");

  return (
    <div className="login-section" style={{ direction: "ltr" }}>
      {/* Left: Agricultural Landscape */}
      <div className="login-left">
        <div className="login-field-rows" />
        <div className="login-hills" />
        <div className="login-mist" />
        <div className="login-vignette" />

        <div className="login-brand">
          <div className="login-brand-logo-wrap">
            <div className="login-brand-logo-ring">
              <div className="login-brand-logo-circle">
                <Image
                  src="/images/meshek-logo.jpeg"
                  alt={t("brandName")}
                  width={180}
                  height={180}
                  className="rounded-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
          <div className="login-brand-name">{t("brandName")}</div>
          <div className="login-brand-sub">{t("brandSubtitle")}</div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="login-right">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
