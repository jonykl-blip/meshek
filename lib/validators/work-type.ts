import { z } from "zod";
import { WORK_TYPE_CATEGORIES } from "@/lib/constants";

export const workTypeSchema = z.object({
  name_he: z
    .string()
    .min(1, "שם בעברית הוא שדה חובה")
    .max(60),
  name_en: z
    .string()
    .max(60)
    .optional()
    .transform((v) => v?.trim() || null),
  name_th: z
    .string()
    .max(60)
    .optional()
    .transform((v) => v?.trim() || null),
  category: z.enum(WORK_TYPE_CATEGORIES, {
    error: "יש לבחור קטגוריה",
  }),
});

export type WorkTypeInput = z.infer<typeof workTypeSchema>;
