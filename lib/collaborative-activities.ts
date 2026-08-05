import type { PeriodType } from "@prisma/client";

/**
 * Nature de l'activité collaborative — second niveau de qualification d'une
 * période, sous les deux formes légales de PeriodType.
 *
 * Sources :
 *  - Circulaire 7167 du 03/06/2019, sous-section 5, qui définit les DEUX
 *    seules formes du travail collaboratif (a. réunions des équipes
 *    pédagogique et éducative ; b. collaboration à visée pédagogique) —
 *    c'est PeriodType, et rien d'autre n'a valeur normative.
 *  - Vade-mecum annexé à cette circulaire, §2 et §8 « Concrètement, sur quoi
 *    pourra porter le travail collaboratif ? », d'où viennent les thèmes
 *    ci-dessous.
 *  - Circulaire 8894 du 20/04/2023, qui pose les balises de mobilisation de
 *    ces périodes dans le cadre du plan de pilotage / contrat d'objectifs.
 *
 * ATTENTION : le vade-mecum précise explicitement qu'« une liste de thèmes
 * n'est pas imposée » et que certains thèmes « sont propres aux réalités
 * locales ». Cette liste est donc une aide à la saisie, pas un référentiel
 * fermé — d'où l'entrée « autre » et le caractère facultatif du champ.
 *
 * Comme pour lib/disciplines.ts, c'est le `slug` qui est stocké en base, pas
 * le libellé : il reste stable si la formulation évolue.
 */

export interface CollaborativeActivity {
  slug: string;
  label: string;
  /// Forme(s) du décret sous lesquelles ce thème se range habituellement.
  /// Certains thèmes relèvent des deux selon qui prend l'initiative.
  forms: PeriodType[];
  /// Précision affichée sous le champ quand la circulaire pose une limite.
  hint?: string;
}

const BOTH: PeriodType[] = ["REUNION_EQUIPE", "COLLABORATION_PEDAGOGIQUE"];

export const COLLABORATIVE_ACTIVITIES: CollaborativeActivity[] = [
  // --- Pilotage (vade-mecum §8, circulaire 8894) ---
  {
    slug: "plan-pilotage",
    label: "Élaboration du plan de pilotage",
    forms: BOTH,
  },
  {
    slug: "contrat-objectifs",
    label: "Mise en œuvre du contrat d'objectifs",
    forms: BOTH,
  },
  {
    slug: "evaluation-contrat",
    label: "Évaluation du contrat d'objectifs",
    forms: ["REUNION_EQUIPE"],
  },
  {
    slug: "reunion-equipe-educative",
    label: "Réunion de l'équipe pédagogique ou éducative",
    forms: ["REUNION_EQUIPE"],
  },

  // --- Collaboration à visée pédagogique (vade-mecum §2b et §8) ---
  {
    slug: "preparation-cours-commun",
    label: "Préparation de cours en commun",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "co-construction-activite",
    label: "Co-construction d'une activité pédagogique",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "sortie-pedagogique",
    label: "Préparation d'une sortie pédagogique (excursion, visite, voyage)",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
    hint: "Seule la conception collective de la sortie relève du travail collaboratif ; le simple accompagnement relève du service à l'école et aux élèves.",
  },
  {
    slug: "pratiques-evaluation",
    label: "Construction des pratiques d'évaluation (épreuves communes, harmonisation)",
    forms: BOTH,
  },
  {
    slug: "remediation-depassement",
    label: "Remédiation et dépassement",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "concertation-horizontale",
    label: "Concertation horizontale (même année d'études)",
    forms: BOTH,
  },
  {
    slug: "concertation-verticale",
    label: "Concertation verticale (continuité entre années)",
    forms: BOTH,
  },
  {
    slug: "concertation-inter-ecoles",
    label: "Concertation inter-écoles ou inter-implantations",
    forms: BOTH,
  },
  {
    slug: "observation-lecons",
    label: "Observation de leçons entre collègues",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "co-titulariat",
    label: "Co-titulariat",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "accompagnement-debutant",
    label: "Accompagnement d'un enseignant débutant (référent, coaching)",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "intervision",
    label: "Intervision",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "co-developpement",
    label: "Co-développement entre collègues",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "dacce",
    label: "Dossier d'accompagnement de l'élève (DAccE)",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },
  {
    slug: "numerique",
    label: "Collaboration autour du numérique",
    forms: ["COLLABORATION_PEDAGOGIQUE"],
  },

  // Le vade-mecum n'impose aucune liste : il faut toujours pouvoir déclarer
  // un thème propre à la réalité locale de l'école.
  {
    slug: "autre",
    label: "Autre",
    forms: BOTH,
  },
];

const BY_SLUG = new Map(COLLABORATIVE_ACTIVITIES.map((a) => [a.slug, a]));

export function isCollaborativeActivitySlug(value: string): boolean {
  return BY_SLUG.has(value);
}

export function collaborativeActivityLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return BY_SLUG.get(slug)?.label ?? null;
}

export function activitiesForForm(form: PeriodType): CollaborativeActivity[] {
  return COLLABORATIVE_ACTIVITIES.filter((a) => a.forms.includes(form));
}
