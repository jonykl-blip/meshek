"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("auth");
  const locale = useLocale();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("anErrorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
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
        {success ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-1">{t("checkEmail")}</h1>
            <p className="text-sm text-muted-foreground text-center mb-4">{t("resetInstructionsSent")}</p>
            <p className="text-sm text-muted-foreground text-center">
              {t("resetInstructionsDescription")}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center mb-1">{t("resetYourPassword")}</h1>
            <p className="text-sm text-muted-foreground text-center mb-8">{t("resetDescription")}</p>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? t("sending") : t("sendResetEmail")}
                </Button>
              </div>
              <div className="mt-6 text-center text-sm">
                {t("hasAccount")}{" "}
                <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                  {t("loginTitle")}
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
