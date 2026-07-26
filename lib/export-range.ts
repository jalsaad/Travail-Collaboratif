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
