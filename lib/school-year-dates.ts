// Calendrier scolaire de la Fédération Wallonie-Bruxelles depuis la réforme
// des rythmes scolaires : l'année commence le DERNIER LUNDI d'août et se
// termine le PREMIER VENDREDI de juillet de l'année suivante.
//
// Ces dates ne bornent aucune saisie — l'application considère comme
// « courante » la SchoolYear dont la startDate est la plus récente (cf.
// lib/school-year-archive.ts). Elles servent de repère et d'étiquetage.

/// Dernier lundi du mois d'août de l'année donnée, en UTC.
function lastMondayOfAugust(year: number): Date {
  const d = new Date(Date.UTC(year, 7, 31)); // 31 août
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/// Premier vendredi du mois de juillet de l'année donnée, en UTC.
function firstFridayOfJuly(year: number): Date {
  const d = new Date(Date.UTC(year, 6, 1)); // 1er juillet
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/// Bornes de l'année scolaire commençant en août `startYear`.
/// Ex : schoolYearDates(2026) -> "2026-2027", 31/08/2026 -> 02/07/2027.
export function schoolYearDates(startYear: number): {
  label: string;
  startDate: Date;
  endDate: Date;
} {
  return {
    label: `${startYear}-${startYear + 1}`,
    startDate: lastMondayOfAugust(startYear),
    endDate: firstFridayOfJuly(startYear + 1),
  };
}
