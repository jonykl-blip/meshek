import { UpdatePasswordForm } from "@/components/update-password-form";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Suspense } from "react";

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

  return (
    <div className="auth-section">
      <Suspense>
        <UpdatePasswordForm />
      </Suspense>
    </div>
  );
}
