import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Prefix non-default locales so redirects land in the correct locale tree
  const localePrefix =
    locale !== routing.defaultLocale ? `/${locale}` : "";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect(`${localePrefix}/auth/error?error=no_user`);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        redirect(`${localePrefix}/auth/error?error=no_profile`);
      }

      if (profile.role === "worker") {
        redirect(`${localePrefix}/auth/error?error=worker_not_allowed`);
      }

      const returnTo = searchParams.get("returnTo");
      const safeReturnTo =
        returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : null;
      const destination =
        safeReturnTo ?? (profile.role === "admin" ? "/admin" : "/dashboard");
      redirect(`${localePrefix}${destination}`);
    } else {
      redirect(
        `${localePrefix}/auth/error?error=${encodeURIComponent(error?.message ?? "auth_failed")}`,
      );
    }
  }

  redirect(`${localePrefix}/auth/error?error=invalid_link`);
}
