import { z } from "zod";

export const createPeriodSchema = z.object({
  type: z.enum(["REUNION_EQUIPE", "COLLABORATION_PEDAGOGIQUE"]),
  date: z.string().min(1, "Date requise"),
  dureePeriodes: z
    .string()
    .min(1, "Durée requise")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Durée invalide"),
  description: z.string().min(3, "Description trop courte"),
  colleagueMembershipIds: z.array(z.string()).default([]),
});
