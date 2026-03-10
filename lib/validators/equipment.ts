import { z } from "zod";

export const equipmentSchema = z.object({
  name: z
    .string()
    .min(1, "שם הציוד הוא שדה חובה")
    .max(100),
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;