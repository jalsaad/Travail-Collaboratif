export class InvalidExportRangeError extends Error {}

// Bornes chronologiques optionnelles communes aux deux routes d'export
// (école et individuelle) — "end" est traité en borne inclusive du jour
// entier (les dates de période sont stockées à minuit, donc une comparaison
// "lte" nue exclurait le jour choisi si jamais une composante horaire non
// nulle apparaissait).
export function parseExportDateRange(searchParams: URLSearchParams) {
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const start = startParam ? new Date(startParam) : null;
  const end = endParam ? new Date(endParam) : null;
  if (start && Number.isNaN(start.getTime())) {
    throw new InvalidExportRangeError("Date de début invalide.");
  }
  if (end && Number.isNaN(end.getTime())) {
    throw new InvalidExportRangeError("Date de fin invalide.");
  }
  const endExclusive = end ? new Date(end.getTime() + 24 * 60 * 60 * 1000) : null;

  return {
    start,
    end,
    dateFilter:
      start || endExclusive
        ? {
            ...(start ? { gte: start } : {}),
            ...(endExclusive ? { lt: endExclusive } : {}),
          }
        : undefined,
  };
}

/// Libellé de la période couverte, pour le titre du relevé : « du 01/09/2025
/// au 20/12/2025 ». Les bornes du formulaire d'export sont facultatives et
/// indépendantes — on retombe alors sur celles de l'année scolaire, qui
/// bornent le relevé de toute façon. Sans année ni borne, rien à annoncer.
export function formatExportRange(
  start: Date | null,
  end: Date | null,
  schoolYear: { startDate: Date; endDate: Date } | null
): string | null {
  const debut = start ?? schoolYear?.startDate ?? null;
  const fin = end ?? schoolYear?.endDate ?? null;
  const jour = (d: Date) => d.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (debut && fin) return `du ${jour(debut)} au ${jour(fin)}`;
  if (debut) return `à partir du ${jour(debut)}`;
  if (fin) return `jusqu'au ${jour(fin)}`;
  return null;
}
