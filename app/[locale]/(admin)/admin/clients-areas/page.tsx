import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllClients, getClients } from "@/app/actions/clients";
import { getAreasWithAliases, getCrops } from "@/app/actions/areas";
import { ClientsAreasView } from "./clients-areas-view";

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
  const t = await getTranslations("admin.clientsAreas");
  return { title: t("title") };
}

export default async function ClientsAreasPage({
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

  const [allClients, activeClients, areas, crops] = await Promise.all([
    getAllClients(),
    getClients(),
    getAreasWithAliases(),
    getCrops(),
  ]);

  const tCA = await getTranslations("admin.clientsAreas");
  const tClients = await getTranslations("admin.clients");
  const tAreas = await getTranslations("admin.areas");

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{tCA("title")}</h1>
      <ClientsAreasView
        allClients={allClients}
        activeClients={activeClients}
        areas={areas}
        crops={crops}
        labels={{
          title: tCA("title"),
          ownFarmSection: tCA("ownFarmSection"),
          addClient: tCA("addClient"),
          searchPlaceholder: tClients("searchPlaceholder"),
          // Client labels
          clientName: tClients("name"),
          clientNameEn: tClients("nameEn"),
          clientPhone: tClients("phone"),
          clientNotes: tClients("notes"),
          clientAliases: tClients("aliases"),
          clientAddAlias: tClients("addAlias"),
          clientOwnFarm: tClients("ownFarm"),
          editClient: tClients("editClient"),
          archiveClient: tClients("archiveClient"),
          archiveClientConfirm: tClients("archiveConfirm", { name: "__NAME__" }),
          archiveClientDescription: tClients("archiveDescription"),
          archiveBlockedOwnFarm: tClients("archiveBlockedOwnFarm"),
          clientCreated: tClients("created"),
          clientUpdated: tClients("updated"),
          clientArchived: tClients("archived"),
          noClients: tClients("noClients"),
          validationClientNameRequired: tClients("validationNameRequired"),
          // Area labels
          areaName: tAreas("name"),
          areaCrop: tAreas("crop"),
          areaAliases: tAreas("aliases"),
          addArea: tAreas("addArea"),
          editArea: tAreas("editArea"),
          archiveArea: tAreas("archiveArea"),
          archiveAreaConfirm: tAreas("archiveConfirm", { name: "__NAME__" }),
          archiveAreaDescription: tAreas("archiveDescription"),
          areaCreated: tAreas("created"),
          areaUpdated: tAreas("updated"),
          areaArchived: tAreas("archived"),
          aliasAdded: tAreas("aliasAdded"),
          aliasRemoved: tAreas("aliasRemoved"),
          noAreas: tAreas("noAreas"),
          addAlias: tAreas("addAlias"),
          createCrop: tAreas("createCrop"),
          cropName: tAreas("cropName"),
          ownField: tAreas("ownField"),
          totalAreaDunam: tAreas("totalAreaDunam"),
          dunamUnit: tAreas("dunamUnit"),
          selectClient: tAreas("selectClient"),
          validationAreaNameRequired: tAreas("validation.nameRequired"),
          validationCropRequired: tAreas("validation.cropRequired"),
          // Shared
          confirm: tClients("confirm"),
          cancel: tClients("cancel"),
          save: tClients("save"),
          saving: tClients("saving"),
          actions: tClients("actions"),
        }}
      />
    </main>
  );
}
