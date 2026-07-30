import type { TeachingLevel } from "@prisma/client";

export const TEACHING_LEVEL_OPTIONS: { value: TeachingLevel; label: string }[] = [
  { value: "MATERNELLE", label: "Maternelle" },
  { value: "PRIMAIRE", label: "Primaire" },
  { value: "SECONDAIRE_INFERIEUR", label: "Secondaire inférieur" },
  { value: "SECONDAIRE_SUPERIEUR", label: "Secondaire supérieur" },
];

// Heures/semaine d'un temps plein par niveau — barème fourni par l'utilisateur.
export const FULL_TIME_HOURS: Record<TeachingLevel, number> = {
  MATERNELLE: 26,
  PRIMAIRE: 24,
  SECONDAIRE_INFERIEUR: 22,
  SECONDAIRE_SUPERIEUR: 21,
};

export type LevelHoursEntry = { level: TeachingLevel; hours: string };

const VALID_LEVELS = new Set<string>(TEACHING_LEVEL_OPTIONS.map((o) => o.value));

// Lit les paires parallèles formData.getAll("level")/getAll("hours") — même
// pattern que colleagueMembershipIds ailleurs dans ce projet — plutôt que des
// champs indexés, pour rester simple côté formulaire (LevelHoursPicker).
export function parseLevelHoursFromFormData(
  formData: FormData
): { ok: true; data: LevelHoursEntry[] } | { ok: false; error: string } {
  const levels = formData.getAll("level").map(String);
  const hours = formData.getAll("hours").map(String);

  if (levels.length === 0 || levels.length !== hours.length) {
    return { ok: false, error: "Au moins un niveau avec ses heures est requis." };
  }

  const seen = new Set<string>();
  const data: LevelHoursEntry[] = [];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const hoursValue = hours[i];

    if (!VALID_LEVELS.has(level)) {
      return { ok: false, error: "Niveau invalide." };
    }
    if (seen.has(level)) {
      return { ok: false, error: "Un même niveau ne peut être sélectionné qu'une fois." };
    }
    // Colonne Decimal(4,2) en base : valeur absolue < 100 (cf. le même
    // garde-fou déjà appliqué à dureePeriodes dans app/(app)/declarer/schema.ts).
    const numeric = Number(hoursValue);
    if (Number.isNaN(numeric) || numeric <= 0 || numeric >= 100) {
      return { ok: false, error: "Nombre d'heures invalide (doit être compris entre 0 et 100)." };
    }

    seen.add(level);
    data.push({ level: level as TeachingLevel, hours: hoursValue });
  }

  return { ok: true, data };
}
