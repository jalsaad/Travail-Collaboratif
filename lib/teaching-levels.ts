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

export type LevelHoursEntry = { level: TeachingLevel; hours: string; discipline: string };

const VALID_LEVELS = new Set<string>(TEACHING_LEVEL_OPTIONS.map((o) => o.value));

// Lit les triplets parallèles formData.getAll("level")/getAll("hours")/
// getAll("discipline") — même pattern que colleagueMembershipIds ailleurs
// dans ce projet — plutôt que des champs indexés, pour rester simple côté
// formulaire (LevelHoursPicker, qui place le champ discipline juste sous le
// niveau de chaque ligne).
//
// Un même niveau peut apparaître plusieurs fois (disciplines différentes
// dans le même niveau) — seul le doublon EXACT niveau+discipline est rejeté,
// pour rester cohérent avec la contrainte @@unique en base.
//
// `required: false` (utilisé par updateTeachingInfo, cf. mon-profil/actions.ts)
// autorise une liste vide — un membre DIRECTION/REFERENT_NUMERIQUE qui ne
// donne pas cours n'a rien à déclarer ici. Reste requis par défaut pour les
// parcours d'inscription ENSEIGNANT (join-form/join-school-form), où au
// moins une déclaration est attendue.
export function parseLevelHoursFromFormData(
  formData: FormData,
  options: { required?: boolean } = {}
): { ok: true; data: LevelHoursEntry[] } | { ok: false; error: string } {
  const required = options.required ?? true;
  const levels = formData.getAll("level").map(String);
  const hours = formData.getAll("hours").map(String);
  const disciplines = formData.getAll("discipline").map(String);

  if (levels.length !== hours.length || levels.length !== disciplines.length) {
    return { ok: false, error: "Données de niveaux invalides." };
  }
  if (required && levels.length === 0) {
    return { ok: false, error: "Au moins un niveau avec ses heures est requis." };
  }

  const seen = new Set<string>();
  const data: LevelHoursEntry[] = [];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const hoursValue = hours[i];
    const discipline = disciplines[i]?.trim();

    if (!VALID_LEVELS.has(level)) {
      return { ok: false, error: "Niveau invalide." };
    }
    if (!discipline) {
      return { ok: false, error: "Discipline requise pour chaque niveau." };
    }
    const key = `${level}::${discipline.toLowerCase()}`;
    if (seen.has(key)) {
      return { ok: false, error: "Un même niveau et une même discipline ne peuvent être déclarés qu'une fois." };
    }
    // Colonne Decimal(4,2) en base : valeur absolue < 100 (cf. le même
    // garde-fou déjà appliqué à dureePeriodes dans app/(app)/declarer/schema.ts).
    const numeric = Number(hoursValue);
    if (Number.isNaN(numeric) || numeric <= 0 || numeric >= 100) {
      return { ok: false, error: "Nombre d'heures invalide (doit être compris entre 0 et 100)." };
    }

    seen.add(key);
    data.push({ level: level as TeachingLevel, hours: hoursValue, discipline });
  }

  return { ok: true, data };
}
