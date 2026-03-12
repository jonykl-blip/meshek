import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCrops } from "@/app/actions/crops";
import { CropsTable } from "./crops-table";

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
  const t = await getTranslations("admin.crops");
  return { title: t("title") };
}

export default async function CropsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.crops");

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

  const crops = await getCrops();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <CropsTable
        crops={crops}
        labels={{
          addCrop: t("addCrop"),
          editCrop: t("editCrop"),
          deleteCrop: t("deleteCrop"),
          name: t("name"),
          deleteConfirm: t("deleteConfirm", { name: "__NAME__" }),
          deleteDescription: t("deleteDescription"),
          confirm: t("confirm"),
          cancel: t("cancel"),
          save: t("save"),
          saving: t("saving"),
          created: t("created"),
          updated: t("updated"),
          deleted: t("deleted"),
          noCrops: t("noCrops"),
          actions: t("actions"),
          validationNameRequired: t("validation.nameRequired"),
        }}
      />
    </main>
  );
}
