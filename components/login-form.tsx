"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const router = useRouter();
  const t = useTranslations("auth");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("anErrorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError(t("enterEmailFirst"));
      return;
    }
    const supabase = createClient();
    setIsSendingMagicLink(true);
    setError(null);
    setMagicLinkSent(false);

    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t("anErrorOccurred"));
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  return (
    <div
      className={cn("login-card", className)}
      dir="rtl"
      {...props}
    >
      <h2 className="mb-1.5 text-2xl font-bold">{t("loginTitle")}</h2>
      <p className="mb-9 text-sm text-muted-foreground">
        {t("loginDescription")}
      </p>

      <form onSubmit={handleLogin}>
        <div className="mb-5">
          <Label htmlFor="email" className="mb-1.5 block text-[0.82rem] font-semibold">
            {t("emailLabel")}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="user@meshek.co.il"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[50px] rounded-md border-[1.5px] bg-background text-[0.95rem] focus-visible:border-primary focus-visible:ring-primary/10"
          />
        </div>

        <div className="mb-5">
          <Label htmlFor="password" className="mb-1.5 block text-[0.82rem] font-semibold">
            {t("passwordLabel")}
          </Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-[50px] rounded-md border-[1.5px] bg-background text-[0.95rem] focus-visible:border-primary focus-visible:ring-primary/10"
          />
        </div>

        <div className="mb-7 flex items-center justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-[0.82rem] font-medium text-primary hover:text-primary/80 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {magicLinkSent && (
          <p className="mb-4 text-sm font-medium text-primary">{t("magicLinkSent")}</p>
        )}

        <Button
          type="submit"
          className="mb-6 h-[50px] w-full rounded-md bg-gradient-to-br from-primary to-[#4A6526] text-base font-semibold shadow-[0_4px_16px_rgba(91,122,47,0.25)] hover:from-[#4A6526] hover:to-[#3A5420] hover:shadow-[0_6px_24px_rgba(91,122,47,0.35)]"
          disabled={isLoading}
        >
          {isLoading ? t("loggingIn") : t("signIn")}
        </Button>
      </form>

      <div className="login-divider">
        <span>{t("orDivider")}</span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mb-6 h-[50px] w-full rounded-md border-[1.5px] bg-card text-[0.9rem] font-medium hover:border-primary/50 hover:bg-secondary"
        onClick={handleMagicLink}
        disabled={isSendingMagicLink}
      >
        <Mail className="h-[18px] w-[18px]" />
        {isSendingMagicLink ? t("loggingIn") : t("magicLinkButton")}
      </Button>

      <p className="text-center text-[0.85rem] text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/auth/sign-up"
          className="font-semibold text-primary hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
