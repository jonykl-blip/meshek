import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllMaterials } from "@/app/actions/materials";
import { MaterialsTable } from "./materials-table";

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
  const t = await getTranslations("admin.materials");
  return { title: t("title") };
}

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.materials");

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

  const materials = await getAllMaterials();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <MaterialsTable
        materials={materials}
        labels={{
          addMaterial: t("addMaterial"),
          editMaterial: t("editMaterial"),
          archiveMaterial: t("archiveMaterial"),
          nameHe: t("nameHe"),
          nameEn: t("nameEn"),
          category: t("category"),
          defaultUnit: t("defaultUnit"),
          archiveConfirm: t("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: t("archiveDescription"),
          confirm: t("confirm"),
          cancel: t("cancel"),
          save: t("save"),
          saving: t("saving"),
          created: t("created"),
          updated: t("updated"),
          archived: t("archived"),
          noMaterials: t("noMaterials"),
          actions: t("actions"),
          search: t("search"),
          allCategories: t("allCategories"),
          categorySpray: t("categorySpray"),
          categorySeed: t("categorySeed"),
          categoryFertilizer: t("categoryFertilizer"),
          categoryOther: t("categoryOther"),
          validationNameRequired: t("validation.nameRequired"),
          validationCategoryRequired: t("validation.categoryRequired"),
        }}
      />
    </main>
  );
}
