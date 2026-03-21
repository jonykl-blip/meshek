import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllClients } from "@/app/actions/clients";
import { ClientsTable } from "./clients-table";

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
  const t = await getTranslations("admin.clients");
  return { title: t("title") };
}

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.clients");

  const supabase = await createClient();

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

  const clients = await getAllClients();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <ClientsTable
        clients={clients}
        labels={{
          title: t("title"),
          addClient: t("addClient"),
          editClient: t("editClient"),
          archiveClient: t("archiveClient"),
          name: t("name"),
          nameEn: t("nameEn"),
          phone: t("phone"),
          notes: t("notes"),
          rateDunam: t("rateDunam"),
          rateHour: t("rateHour"),
          aliases: t("aliases"),
          addAlias: t("addAlias"),
          removeAlias: t("removeAlias"),
          ownFarm: t("ownFarm"),
          archiveConfirm: t("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: t("archiveDescription"),
          archiveBlockedOwnFarm: t("archiveBlockedOwnFarm"),
          confirm: t("confirm"),
          cancel: t("cancel"),
          save: t("save"),
          saving: t("saving"),
          created: t("created"),
          updated: t("updated"),
          archived: t("archived"),
          noClients: t("noClients"),
          actions: t("actions"),
          validationNameRequired: t("validationNameRequired"),
          searchPlaceholder: t("searchPlaceholder"),
        }}
      />
    </main>
  );
}
