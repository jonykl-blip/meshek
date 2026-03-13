import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkersTable } from "./workers-table";

export function generateStaticParams() {
  return [{ locale: "he" }, { locale: "th" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.workers");
  return { title: t("title") };
}

export default async function WorkersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.workers");

  const supabase = await createClient();

  // Verify admin/owner role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch all active profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, language_pref, telegram_id, hourly_rate, is_active, profile_aliases(id, alias)")
    .eq("is_active", true)
    .order("full_name");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <WorkersTable
        profiles={profiles ?? []}
        labels={{
          name: t("name"),
          role: t("role"),
          language: t("language"),
          telegramId: t("telegramId"),
          save: t("save"),
          saving: t("saving"),
          noTelegramId: t("noTelegramId"),
          saved: t("saved"),
          addWorker: t("addWorker"),
          editWorker: t("editWorker"),
          archiveWorker: t("archiveWorker"),
          hourlyRate: t("hourlyRate"),
          cancel: t("cancel"),
          archiveConfirm: t("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: t("archiveDescription"),
          confirm: t("confirm"),
          created: t("created"),
          updated: t("updated"),
          archived: t("archived"),
          actions: t("actions"),
          roleWorker: t("roleWorker"),
          roleManager: t("roleManager"),
          roleAdmin: t("roleAdmin"),
          roleOwner: t("roleOwner"),
          langHe: t("langHe"),
          langTh: t("langTh"),
          langEn: t("langEn"),
          noWorkers: t("noWorkers"),
          aliases: t("aliases"),
          addAlias: t("addAlias"),
          aliasPlaceholder: t("aliasPlaceholder"),
          aliasAdded: t("aliasAdded"),
          aliasRemoved: t("aliasRemoved"),
          email: t("email"),
          emailPlaceholder: t("emailPlaceholder"),
          inviteSent: t("inviteSent"),
          validationNameRequired: t("validation.nameRequired"),
          validationRatePositive: t("validation.ratePositive"),
          validationTelegramNumeric: t("validation.telegramNumeric"),
          validationEmailRequired: t("validation.emailRequired"),
          validationEmailInvalid: t("validation.emailInvalid"),
        }}
      />
    </main>
  );
}
