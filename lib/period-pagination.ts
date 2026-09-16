// Pagination des listes de périodes, partagée par les trois écrans qui en
// affichent : l'espace enseignant, l'espace direction et le détail d'école
// côté plateforme.
//
// Ces listes se parcourent du plus récent au plus ancien, et on y cherche
// presque toujours quelque chose de récent : un « voir plus » qui allonge la
// liste sert mieux que des pages numérotées, où l'on ne saurait pas dans
// laquelle chercher.
//
// La limite vit dans l'URL plutôt que dans un état client : la page reste un
// composant serveur, et c'est la requête elle-même qui se borne — une
// pagination côté client aurait chargé toute la table pour n'en montrer
// qu'un bout, exactement ce qu'on veut éviter.

export const PERIODES_PAR_PAGE = 25;

/// Garde-fou : sans plafond, une URL forgée à la main (`?periodes=999999`)
/// rendrait la borne inutile.
const LIMITE_MAX = 500;

/// Lit la limite demandée dans l'URL. Toute valeur absente, illisible ou hors
/// bornes retombe sur la première page — on ne renvoie jamais d'erreur pour
/// un paramètre d'affichage.
export function limitePeriodes(valeur: string | undefined): number {
  const demande = Number(valeur);
  if (!Number.isInteger(demande) || demande < PERIODES_PAR_PAGE) return PERIODES_PAR_PAGE;
  return Math.min(demande, LIMITE_MAX);
}

/// Découpe le résultat d'une requête faite avec `take: limite + 1`. Ce +1 est
/// la seule façon de savoir s'il reste quelque chose SANS payer un `count`
/// supplémentaire à chaque affichage : si la ligne excédentaire est là, c'est
/// qu'il y a une suite.
export function decouperPeriodes<T>(
  resultats: T[],
  limite: number
): { visibles: T[]; resteAVoir: boolean; limiteSuivante: number } {
  const resteAVoir = resultats.length > limite;
  return {
    visibles: resteAVoir ? resultats.slice(0, limite) : resultats,
    resteAVoir,
    limiteSuivante: Math.min(limite + PERIODES_PAR_PAGE, LIMITE_MAX),
  };
}
