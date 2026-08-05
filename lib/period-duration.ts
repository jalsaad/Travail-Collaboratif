// Conversion plage horaire -> nombre de périodes.
//
// L'objectif annuel de travail collaboratif est exprimé en périodes
// (cf. AnnualAssignment.objectifPeriodes, 60 pour un temps plein), tandis que
// l'enseignant·e saisit une heure de début et une heure de fin. La durée en
// périodes reste donc stockée en base (CollaborativePeriod.dureePeriodes) et
// alimente les calculs d'avancement (lib/collaboration-progress.ts) : elle est
// simplement dérivée des horaires au lieu d'être saisie à la main.

/// Durée conventionnelle d'une période de cours en FWB.
export const MINUTES_PAR_PERIODE = 50;

/// Heure locale de l'école, telle que produite par <input type="time"> : "HH:MM".
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string | null | undefined): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

/// Minutes écoulées depuis minuit, ou null si l'heure est mal formée.
export function minutesFromTime(value: string | null | undefined): number | null {
  if (!isValidTime(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/// Nombre de périodes couvertes par la plage, arrondi au demi-période le plus
/// proche (jamais moins de 0,5). Retourne null si l'une des heures est
/// invalide ou si la fin n'est pas strictement postérieure au début — les
/// périodes à cheval sur minuit ne sont pas gérées, une déclaration porte sur
/// une seule date.
export function periodesBetween(
  heureDebut: string | null | undefined,
  heureFin: string | null | undefined
): number | null {
  const start = minutesFromTime(heureDebut);
  const end = minutesFromTime(heureFin);
  if (start === null || end === null || end <= start) return null;

  const periodes = Math.round(((end - start) / MINUTES_PAR_PERIODE) * 2) / 2;
  return Math.max(periodes, 0.5);
}

/// "09:00 – 10:40", ou null si la plage n'est pas renseignée. Les périodes
/// déclarées avant l'introduction des horaires n'en ont pas (colonnes
/// nullables) et n'affichent alors que leur durée.
export function formatTimeRange(
  heureDebut: string | null | undefined,
  heureFin: string | null | undefined
): string | null {
  if (!isValidTime(heureDebut) || !isValidTime(heureFin)) return null;
  return `${heureDebut} – ${heureFin}`;
}

/// Ligne récapitulative affichée sous une période : "09:00 – 10:40 · 2 période(s)".
export function formatPeriodSchedule(
  heureDebut: string | null | undefined,
  heureFin: string | null | undefined,
  dureePeriodes: string
): string {
  const range = formatTimeRange(heureDebut, heureFin);
  const duree = `${dureePeriodes} période(s)`;
  return range ? `${range} · ${duree}` : duree;
}
