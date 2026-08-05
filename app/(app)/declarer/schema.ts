import { z } from "zod";
import { isValidTime, periodesBetween } from "@/lib/period-duration";
import { isCollaborativeActivitySlug } from "@/lib/collaborative-activities";

/// Champs communs à la déclaration et à la modification d'une période, côté
/// enseignant comme côté admin (cf. app/admin/periodes/[periodId]/actions.ts).
export const periodCoreFields = {
  type: z.enum(["REUNION_EQUIPE", "COLLABORATION_PEDAGOGIQUE"]),
  date: z.string().min(1, "Date requise"),
  heureDebut: z.string().refine(isValidTime, "Heure de début requise"),
  heureFin: z.string().refine(isValidTime, "Heure de fin requise"),
  // Facultatif : le vade-mecum annexé à la circulaire 7167 précise qu'« une
  // liste de thèmes n'est pas imposée » (§8).
  natureActivite: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || isCollaborativeActivitySlug(v), "Nature d'activité inconnue")
    .transform((v) => (v === "" ? null : v)),
  description: z.string().min(3, "Description trop courte"),
  // 4e colonne du formulaire officiel de recensement, facultative comme dans
  // le modèle de la circulaire.
  objectifsPilotage: z
    .string()
    .max(500, "Texte trop long (500 caractères maximum)")
    .transform((v) => v.trim() || null),
};

/// La durée en périodes est dérivée de la plage horaire, jamais reçue du
/// formulaire. Elle est bornée par construction (moins de 24 h dans une
/// journée, soit < 29 périodes), ce qui respecte la colonne Decimal(4,2)
/// de schema.prisma sans garde-fou supplémentaire.
export const timeRangeIsOrdered = {
  check: (data: { heureDebut: string; heureFin: string }) =>
    periodesBetween(data.heureDebut, data.heureFin) !== null,
  params: {
    message: "L'heure de fin doit être postérieure à l'heure de début.",
    path: ["heureFin"],
  },
};

export const createPeriodSchema = z
  .object({
    ...periodCoreFields,
    colleagueMembershipIds: z.array(z.string()).default([]),
  })
  .refine(timeRangeIsOrdered.check, timeRangeIsOrdered.params);
