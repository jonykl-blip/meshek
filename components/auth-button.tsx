import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const t = await getTranslations("auth");

  return user ? (
    <div className="flex items-center gap-4">
      {t("greeting", { email: user.email ?? "" })}
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline" className="border-[1.5px] font-semibold hover:bg-secondary/80">
        <Link href="/auth/login">{t("signIn")}</Link>
      </Button>
      <Button asChild size="sm" className="bg-gradient-to-br from-primary to-[#4A6526] font-semibold shadow-sm hover:from-[#4A6526] hover:to-[#3A5420]">
        <Link href="/auth/sign-up">{t("signUp")}</Link>
      </Button>
    </div>
  );
}
