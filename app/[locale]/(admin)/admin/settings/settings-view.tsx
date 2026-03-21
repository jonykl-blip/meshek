"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkTypesTable } from "../work-types/work-types-table";
import { MaterialsTable } from "../materials/materials-table";
import { CropsTable } from "../crops/crops-table";
import { EquipmentTable } from "../equipment/equipment-table";
import type { WorkType } from "@/app/actions/work-types";
import type { Material } from "@/app/actions/materials";
import type { Crop } from "@/app/actions/crops";
import type { Equipment } from "@/app/actions/equipment";

interface SettingsViewProps {
  workTypes: WorkType[];
  materials: Material[];
  crops: Crop[];
  equipment: Equipment[];
  tabLabels: {
    workTypes: string;
    materials: string;
    crops: string;
    equipment: string;
  };
  workTypesLabels: Parameters<typeof WorkTypesTable>[0]["labels"];
  materialsLabels: Parameters<typeof MaterialsTable>[0]["labels"];
  cropsLabels: Parameters<typeof CropsTable>[0]["labels"];
  equipmentLabels: Parameters<typeof EquipmentTable>[0]["labels"];
}

const TAB_KEYS = ["work-types", "materials", "crops", "equipment"] as const;

export function SettingsView({
  workTypes,
  materials,
  crops,
  equipment,
  tabLabels,
  workTypesLabels,
  materialsLabels,
  cropsLabels,
  equipmentLabels,
}: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = TAB_KEYS.includes(searchParams.get("tab") as typeof TAB_KEYS[number])
    ? (searchParams.get("tab") as string)
    : "work-types";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "work-types") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="mb-6 w-full justify-start">
        <TabsTrigger value="work-types">{tabLabels.workTypes}</TabsTrigger>
        <TabsTrigger value="materials">{tabLabels.materials}</TabsTrigger>
        <TabsTrigger value="crops">{tabLabels.crops}</TabsTrigger>
        <TabsTrigger value="equipment">{tabLabels.equipment}</TabsTrigger>
      </TabsList>

      <TabsContent value="work-types">
        <WorkTypesTable workTypes={workTypes} labels={workTypesLabels} />
      </TabsContent>

      <TabsContent value="materials">
        <MaterialsTable materials={materials} labels={materialsLabels} />
      </TabsContent>

      <TabsContent value="crops">
        <CropsTable crops={crops} labels={cropsLabels} />
      </TabsContent>

      <TabsContent value="equipment">
        <EquipmentTable equipment={equipment} labels={equipmentLabels} />
      </TabsContent>
    </Tabs>
  );
}
