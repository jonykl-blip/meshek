import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllWorkTypes } from "@/app/actions/work-types";
import { getAllMaterials } from "@/app/actions/materials";
import { getCrops } from "@/app/actions/crops";
import { getEquipment } from "@/app/actions/equipment";
import { SettingsView } from "./settings-view";

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
  const t = await getTranslations("admin.settings");
  return { title: t("title") };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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

  const [workTypes, materials, crops, equipment] = await Promise.all([
    getAllWorkTypes(),
    getAllMaterials(),
    getCrops(),
    getEquipment(),
  ]);

  const tSettings = await getTranslations("admin.settings");
  const tWorkTypes = await getTranslations("admin.workTypes");
  const tMaterials = await getTranslations("admin.materials");
  const tCrops = await getTranslations("admin.crops");
  const tEquipment = await getTranslations("admin.equipment");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{tSettings("title")}</h1>
      <SettingsView
        workTypes={workTypes}
        materials={materials}
        crops={crops}
        equipment={equipment}
        tabLabels={{
          workTypes: tSettings("tabs.workTypes"),
          materials: tSettings("tabs.materials"),
          crops: tSettings("tabs.crops"),
          equipment: tSettings("tabs.equipment"),
        }}
        workTypesLabels={{
          addWorkType: tWorkTypes("addWorkType"),
          editWorkType: tWorkTypes("editWorkType"),
          archiveWorkType: tWorkTypes("archiveWorkType"),
          nameHe: tWorkTypes("nameHe"),
          nameEn: tWorkTypes("nameEn"),
          nameTh: tWorkTypes("nameTh"),
          category: tWorkTypes("category"),
          isActive: tWorkTypes("isActive"),
          active: tWorkTypes("active"),
          inactive: tWorkTypes("inactive"),
          archiveConfirm: tWorkTypes("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: tWorkTypes("archiveDescription"),
          archiveLinkedWarning: tWorkTypes("archiveLinkedWarning"),
          confirm: tWorkTypes("confirm"),
          cancel: tWorkTypes("cancel"),
          save: tWorkTypes("save"),
          saving: tWorkTypes("saving"),
          created: tWorkTypes("created"),
          updated: tWorkTypes("updated"),
          archived: tWorkTypes("archived"),
          noWorkTypes: tWorkTypes("noWorkTypes"),
          actions: tWorkTypes("actions"),
          search: tWorkTypes("search"),
          allCategories: tWorkTypes("allCategories"),
          showAll: tWorkTypes("showAll"),
          activeOnly: tWorkTypes("activeOnly"),
          inactiveOnly: tWorkTypes("inactiveOnly"),
          categoryFieldWork: tWorkTypes("categories.fieldWork"),
          categorySpraying: tWorkTypes("categories.spraying"),
          categoryPlanting: tWorkTypes("categories.planting"),
          categoryHarvest: tWorkTypes("categories.harvest"),
          categoryIrrigation: tWorkTypes("categories.irrigation"),
          categoryMaintenance: tWorkTypes("categories.maintenance"),
          categoryLogistics: tWorkTypes("categories.logistics"),
          categoryAdmin: tWorkTypes("categories.admin"),
          categoryOther: tWorkTypes("categories.other"),
          validationNameRequired: tWorkTypes("validation.nameRequired"),
          validationCategoryRequired: tWorkTypes("validation.categoryRequired"),
        }}
        materialsLabels={{
          addMaterial: tMaterials("addMaterial"),
          editMaterial: tMaterials("editMaterial"),
          archiveMaterial: tMaterials("archiveMaterial"),
          nameHe: tMaterials("nameHe"),
          nameEn: tMaterials("nameEn"),
          category: tMaterials("category"),
          defaultUnit: tMaterials("defaultUnit"),
          archiveConfirm: tMaterials("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: tMaterials("archiveDescription"),
          confirm: tMaterials("confirm"),
          cancel: tMaterials("cancel"),
          save: tMaterials("save"),
          saving: tMaterials("saving"),
          created: tMaterials("created"),
          updated: tMaterials("updated"),
          archived: tMaterials("archived"),
          noMaterials: tMaterials("noMaterials"),
          actions: tMaterials("actions"),
          search: tMaterials("search"),
          allCategories: tMaterials("allCategories"),
          categorySpray: tMaterials("categorySpray"),
          categorySeed: tMaterials("categorySeed"),
          categoryFertilizer: tMaterials("categoryFertilizer"),
          categoryOther: tMaterials("categoryOther"),
          validationNameRequired: tMaterials("validation.nameRequired"),
          validationCategoryRequired: tMaterials("validation.categoryRequired"),
        }}
        cropsLabels={{
          addCrop: tCrops("addCrop"),
          editCrop: tCrops("editCrop"),
          deleteCrop: tCrops("deleteCrop"),
          name: tCrops("name"),
          deleteConfirm: tCrops("deleteConfirm", { name: "__NAME__" }),
          deleteDescription: tCrops("deleteDescription"),
          confirm: tCrops("confirm"),
          cancel: tCrops("cancel"),
          save: tCrops("save"),
          saving: tCrops("saving"),
          created: tCrops("created"),
          updated: tCrops("updated"),
          deleted: tCrops("deleted"),
          noCrops: tCrops("noCrops"),
          actions: tCrops("actions"),
          validationNameRequired: tCrops("validation.nameRequired"),
        }}
        equipmentLabels={{
          addEquipment: tEquipment("addEquipment"),
          editEquipment: tEquipment("editEquipment"),
          archiveEquipment: tEquipment("archiveEquipment"),
          name: tEquipment("name"),
          archiveConfirm: tEquipment("archiveConfirm", { name: "__NAME__" }),
          archiveDescription: tEquipment("archiveDescription"),
          confirm: tEquipment("confirm"),
          cancel: tEquipment("cancel"),
          save: tEquipment("save"),
          saving: tEquipment("saving"),
          created: tEquipment("created"),
          updated: tEquipment("updated"),
          archived: tEquipment("archived"),
          noEquipment: tEquipment("noEquipment"),
          actions: tEquipment("actions"),
          validationNameRequired: tEquipment("validation.nameRequired"),
        }}
      />
    </main>
  );
}
