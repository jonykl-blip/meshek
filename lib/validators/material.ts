import { z } from "zod";
import { MATERIAL_CATEGORIES } from "@/lib/constants";

export const materialSchema = z.object({
  name_he: z
    .string()
    .min(1, "שם בעברית הוא שדה חובה")
    .max(60),
  name_en: z
    .string()
    .max(60)
    .optional()
    .transform((v) => v?.trim() || null),
  category: z.enum(MATERIAL_CATEGORIES, {
    error: "יש לבחור קטגוריה",
  }),
  default_unit: z
    .string()
    .max(20)
    .optional()
    .transform((v) => v?.trim() || null),
});

export type MaterialInput = z.infer<typeof materialSchema>;
