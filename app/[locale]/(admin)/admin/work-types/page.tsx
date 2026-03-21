import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllWorkTypes } from "@/app/actions/work-types";
import { WorkTypesTable } from "./work-types-table";

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
  const t = await getTranslations("admin.workTypes");
  return { title: t("title") };
}

export default async function WorkTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.workTypes");

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

  const workTypes = await getAllWorkTypes();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <WorkTypesTable
        workTypes={workTypes}
        labels={{
          addWorkType: t("addWorkType"),
          editWorkType: t("editWorkType"),
          archiveWorkType: t("archiveWorkType"),
          nameHe: t("nameHe"),
          nameEn: t("nameEn"),
          nameTh: t("nameTh"),
          category: t("category"),
          isActive: t("isActive"),
          active: t("active"),
          inactive: t("inactive"),
          archiveConfirm: t("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: t("archiveDescription"),
          archiveLinkedWarning: t("archiveLinkedWarning"),
          confirm: t("confirm"),
          cancel: t("cancel"),
          save: t("save"),
          saving: t("saving"),
          created: t("created"),
          updated: t("updated"),
          archived: t("archived"),
          noWorkTypes: t("noWorkTypes"),
          actions: t("actions"),
          search: t("search"),
          allCategories: t("allCategories"),
          showAll: t("showAll"),
          activeOnly: t("activeOnly"),
          inactiveOnly: t("inactiveOnly"),
          categoryFieldWork: t("categories.fieldWork"),
          categorySpraying: t("categories.spraying"),
          categoryPlanting: t("categories.planting"),
          categoryHarvest: t("categories.harvest"),
          categoryIrrigation: t("categories.irrigation"),
          categoryMaintenance: t("categories.maintenance"),
          categoryLogistics: t("categories.logistics"),
          categoryAdmin: t("categories.admin"),
          categoryOther: t("categories.other"),
          validationNameRequired: t("validation.nameRequired"),
          validationCategoryRequired: t("validation.categoryRequired"),
        }}
      />
    </main>
  );
}
