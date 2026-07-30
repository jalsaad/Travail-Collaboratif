import { z } from "zod";

export const createPeriodSchema = z.object({
  type: z.enum(["REUNION_EQUIPE", "COLLABORATION_PEDAGOGIQUE"]),
  date: z.string().min(1, "Date requise"),
  dureePeriodes: z
    .string()
    .min(1, "Durée requise")
    // Colonne Decimal(4,2) en base (cf. schema.prisma) : valeur absolue < 100,
    // sinon Postgres lève une erreur numérique non rattrapable côté Prisma.
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) < 100,
      "Durée invalide (doit être comprise entre 0 et 100)"
    ),
  description: z.string().min(3, "Description trop courte"),
  colleagueMembershipIds: z.array(z.string()).default([]),
});
