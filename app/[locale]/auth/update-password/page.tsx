import { UpdatePasswordForm } from "@/components/update-password-form";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <UpdatePasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
