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

/// Nombre de périodes couvertes par la plage, à sa valeur exacte sur deux
/// décimales — la précision de la colonne Decimal(4,2) qui la stocke.
///
/// Volontairement PAS d'arrondi au demi-période : le quota annuel a valeur
/// réglementaire, et compter une réunion d'une heure pour 1 période au lieu
/// de 1,2 sous-évaluerait le compteur de 17 % sur un cas très courant.
///
/// Retourne null si l'une des heures est invalide ou si la fin n'est pas
/// strictement postérieure au début — les périodes à cheval sur minuit ne
/// sont pas gérées, une déclaration porte sur une seule date.
export function periodesBetween(
  heureDebut: string | null | undefined,
  heureFin: string | null | undefined
): number | null {
  const start = minutesFromTime(heureDebut);
  const end = minutesFromTime(heureFin);
  if (start === null || end === null || end <= start) return null;

  // Une durée en minutes divisée par 50 tombe toujours sur un multiple exact
  // de 0,02 : l'arrondi ne fait que gommer le bruit de la virgule flottante,
  // il ne perd aucune information.
  return Math.round(((end - start) / MINUTES_PAR_PERIODE) * 100) / 100;
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

/// Formate un nombre de périodes pour l'affichage francophone : virgule
/// décimale, deux décimales au maximum, sans zéro inutile en fin
/// (1 → "1", 1,2 → "1,2", 0,94 → "0,94").
///
/// Réservé à l'AFFICHAGE. L'archive JSON de fin d'année
/// (lib/school-year-archive.ts) conserve la valeur brute non localisée, sans
/// quoi elle ne serait plus réimportable.
export function formatPeriodes(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 }).format(n);
}

/// Ligne récapitulative affichée sous une période : "09:00 – 10:40 · 2 période(s)".
export function formatPeriodSchedule(
  heureDebut: string | null | undefined,
  heureFin: string | null | undefined,
  dureePeriodes: string
): string {
  const range = formatTimeRange(heureDebut, heureFin);
  const duree = `${formatPeriodes(dureePeriodes)} période(s)`;
  return range ? `${range} · ${duree}` : duree;
}
