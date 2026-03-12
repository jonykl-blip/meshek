import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAreasWithAliases, getCrops } from "@/app/actions/areas";
import { AreasTable } from "./areas-table";

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
  const t = await getTranslations("admin.areas");
  return { title: t("title") };
}

export default async function AreasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.areas");

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

  const [areas, crops] = await Promise.all([
    getAreasWithAliases(),
    getCrops(),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <AreasTable
        areas={areas}
        crops={crops}
        labels={{
          addArea: t("addArea"),
          editArea: t("editArea"),
          archiveArea: t("archiveArea"),
          name: t("name"),
          crop: t("crop"),
          aliases: t("aliases"),
          addAlias: t("addAlias"),
          removeAlias: t("removeAlias"),
          archiveConfirm: t("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: t("archiveDescription"),
          confirm: t("confirm"),
          cancel: t("cancel"),
          save: t("save"),
          saving: t("saving"),
          created: t("created"),
          updated: t("updated"),
          archived: t("archived"),
          aliasAdded: t("aliasAdded"),
          aliasRemoved: t("aliasRemoved"),
          noAreas: t("noAreas"),
          actions: t("actions"),
          createCrop: t("createCrop"),
          cropName: t("cropName"),
          noCrops: t("noCrops"),
          validationNameRequired: t("validation.nameRequired"),
          validationCropRequired: t("validation.cropRequired"),
        }}
      />
    </main>
  );
}
