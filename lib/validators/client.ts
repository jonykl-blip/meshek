import { z } from "zod";

export const clientSchema = z.object({
  name: z
    .string()
    .min(1, "שם הלקוח הוא שדה חובה")
    .max(100),
  name_en: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v?.trim() || null),
  phone: z
    .string()
    .max(20)
    .optional()
    .transform((v) => v?.trim() || null),
  notes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v?.trim() || null),
  rate_per_dunam: z
    .number()
    .positive("תעריף חייב להיות חיובי")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  rate_per_hour: z
    .number()
    .positive("תעריף חייב להיות חיובי")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const clientAliasSchema = z.object({
  alias: z
    .string()
    .min(1, "שם הכינוי הוא שדה חובה")
    .max(100),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientAliasInput = z.infer<typeof clientAliasSchema>;
