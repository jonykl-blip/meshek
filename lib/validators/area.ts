import { z } from "zod";

export const areaSchema = z.object({
  name: z
    .string()
    .min(1, "שם השטח הוא שדה חובה")
    .max(100),
  crop_id: z
    .string()
    .uuid("יש לבחור גידול"),
});

export const areaAliasSchema = z.object({
  alias: z
    .string()
    .min(1, "שם הכינוי הוא שדה חובה")
    .max(100),
});

export type AreaInput = z.infer<typeof areaSchema>;
export type AreaAliasInput = z.infer<typeof areaAliasSchema>;