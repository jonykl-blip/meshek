"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("auth");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/");
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
        <h1 className="text-2xl font-bold text-center mb-1">{t("resetYourPassword")}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{t("enterNewPassword")}</p>
        <form onSubmit={handleUpdatePassword}>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("newPassword")}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] rounded-md border-[1.5px] bg-background text-[0.95rem] focus-visible:border-primary focus-visible:ring-primary/10"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="h-[50px] w-full rounded-md bg-gradient-to-br from-primary to-[#4A6526] text-base font-semibold shadow-[0_4px_16px_rgba(91,122,47,0.25)] hover:from-[#4A6526] hover:to-[#3A5420] hover:shadow-[0_6px_24px_rgba(91,122,47,0.35)]"
              disabled={isLoading}
            >
              {isLoading ? t("saving") : t("saveNewPassword")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
