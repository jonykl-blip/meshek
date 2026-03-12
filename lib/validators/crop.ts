import { z } from "zod";

export const cropSchema = z.object({
  name: z
    .string()
    .min(1, "שם הגידול הוא שדה חובה")
    .max(100),
});

export type CropInput = z.infer<typeof cropSchema>;
