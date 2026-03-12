import { z } from "zod";

export const workerProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "שם הוא שדה חובה")
    .max(100),
  telegram_id: z
    .string()
    .regex(/^\d+$/, "מזהה טלגרם חייב להיות מספרי")
    .optional()
    .or(z.literal("")),
  hourly_rate: z
    .number()
    .positive("תעריף חייב להיות חיובי")
    .multipleOf(0.01)
    .optional()
    .nullable(),
  language_pref: z.enum(["he", "th", "en"]),
  role: z.enum(["worker", "manager", "admin"]),
});

export const profileAliasSchema = z.object({
  alias: z
    .string()
    .min(1, "שם הכינוי הוא שדה חובה")
    .max(100),
});

export type WorkerProfileInput = z.infer<typeof workerProfileSchema>;
export type ProfileAliasInput = z.infer<typeof profileAliasSchema>;
