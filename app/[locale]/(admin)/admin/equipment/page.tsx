import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEquipment } from "@/app/actions/equipment";
import { EquipmentTable } from "./equipment-table";

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
  const t = await getTranslations("admin.equipment");
  return { title: t("title") };
}

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.equipment");

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

  const equipment = await getEquipment();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <EquipmentTable
        equipment={equipment}
        labels={{
          addEquipment: t("addEquipment"),
          editEquipment: t("editEquipment"),
          archiveEquipment: t("archiveEquipment"),
          name: t("name"),
          archiveConfirm: t("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: t("archiveDescription"),
          confirm: t("confirm"),
          cancel: t("cancel"),
          save: t("save"),
          saving: t("saving"),
          created: t("created"),
          updated: t("updated"),
          archived: t("archived"),
          noEquipment: t("noEquipment"),
          actions: t("actions"),
          validationNameRequired: t("validation.nameRequired"),
        }}
      />
    </main>
  );
}
