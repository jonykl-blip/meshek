"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("auth");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t("passwordMismatch"));
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      router.push("/auth/login");
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
        <h1 className="text-2xl font-bold text-center mb-1">{t("signUpTitle")}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{t("signUpDescription")}</p>
        <form onSubmit={handleSignUp}>
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
                className="h-[50px] rounded-md border-[1.5px] bg-background text-[0.95rem] focus-visible:border-primary focus-visible:ring-primary/10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] rounded-md border-[1.5px] bg-background text-[0.95rem] focus-visible:border-primary focus-visible:ring-primary/10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password">{t("repeatPasswordLabel")}</Label>
              <Input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="h-[50px] rounded-md border-[1.5px] bg-background text-[0.95rem] focus-visible:border-primary focus-visible:ring-primary/10"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="h-[50px] w-full rounded-md bg-gradient-to-br from-primary to-[#4A6526] text-base font-semibold shadow-[0_4px_16px_rgba(91,122,47,0.25)] hover:from-[#4A6526] hover:to-[#3A5420] hover:shadow-[0_6px_24px_rgba(91,122,47,0.35)]"
              disabled={isLoading}
            >
              {isLoading ? t("creatingAccount") : t("signUpTitle")}
            </Button>
          </div>
          <div className="mt-6 text-center text-sm">
            {t("hasAccount")}{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">
              {t("loginTitle")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
