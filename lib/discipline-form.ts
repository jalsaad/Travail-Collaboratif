import type { Prisma } from "@prisma/client";
import { toOptions } from "@/lib/disciplines";

// Toutes les valeurs sélectionnables par le <select> de LevelHoursPicker —
// calculé une seule fois (référentiel statique, cf. lib/disciplines.ts).
const OPTION_LABEL_BY_VALUE = new Map(toOptions().map((o) => [o.value, o.label]));

// Slug (valeur) de l'option "Autre (à préciser)" dans le référentiel — seule
// option sans code officiel, qui déclenche le champ de précision libre.
export const AUTRE_DISCIPLINE_VALUE = "autre";

function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "precisee";
}

export type DisciplineResolution = { ok: true; code: string; label: string } | { ok: false; error: string };

// Ne fait jamais confiance au libellé envoyé par le client : le code soumis
// doit correspondre à une option réelle du référentiel (lib/disciplines.ts).
// Cas particulier "Autre (à préciser)" : la précision libre saisie par
// l'utilisateur DEVIENT le libellé stocké, et un code synthétique
// "autre:<slug>" est dérivé de cette précision — pas le code partagé
// "autre" seul, sinon deux enseignants précisant des disciplines
// différentes écraseraient le même enregistrement Discipline (contrainte
// d'unicité sur code).
export function resolveDisciplineOption(code: string, precision?: string): DisciplineResolution {
  const baseLabel = OPTION_LABEL_BY_VALUE.get(code);
  if (!baseLabel) {
    return { ok: false, error: "Discipline invalide." };
  }
  if (code !== AUTRE_DISCIPLINE_VALUE) {
    return { ok: true, code, label: baseLabel };
  }
  const trimmed = precision?.trim();
  if (!trimmed) {
    return { ok: false, error: "Merci de préciser la discipline choisie (« Autre »)." };
  }
  return { ok: true, code: `${AUTRE_DISCIPLINE_VALUE}:${slugify(trimmed)}`, label: `Autre — ${trimmed}` };
}

// Reconstruit les valeurs par défaut du <select> + du champ de précision à
// partir d'une Discipline existante — utilisé pour précharger le formulaire
// d'édition (cf. app/(app)/mon-profil/page.tsx).
export function toPickerDefaultValue(code: string | null, label: string): { discipline: string; precision: string } {
  if (code?.startsWith(`${AUTRE_DISCIPLINE_VALUE}:`)) {
    return { discipline: AUTRE_DISCIPLINE_VALUE, precision: label.replace(/^Autre — /, "") };
  }
  return { discipline: code ?? "", precision: "" };
}

// Trouve la Discipline existante par code officiel (cf. lib/disciplines.ts)
// ou la crée — le code est la clé stable ("c'est lui qu'on stocke, pas le
// libellé"), gardant la table normalisée pour le ciblage des annonces (cf.
// components/announcement-form.tsx) et le filtre de l'annuaire admin (cf.
// lib/admin-directory.ts).
export async function resolveOrCreateDiscipline(tx: Prisma.TransactionClient, code: string, label: string) {
  return tx.discipline.upsert({ where: { code }, update: { name: label }, create: { code, name: label } });
}
