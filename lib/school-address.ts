/// Assemble les trois champs d'adresse en une ligne lisible.
/// Chacun est facultatif : les écoles créées avant le découpage de l'adresse
/// n'ont que `address` (leur ancienne adresse complète en texte libre), et
/// renvoient donc simplement celle-ci.
export function formatSchoolAddress(school: {
  address?: string | null;
  postalCode?: string | null;
  locality?: string | null;
  /// Renseigné seulement pour les écoles à programme belge à l'étranger.
  country?: string | null;
}): string | null {
  const cityLine = [school.postalCode, school.locality].filter(Boolean).join(" ");
  const parts = [school.address, cityLine, school.country]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
