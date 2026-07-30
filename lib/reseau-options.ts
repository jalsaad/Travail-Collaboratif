// Réseaux d'enseignement de la Fédération Wallonie-Bruxelles — liste fermée
// fournie par l'utilisateur. Reste un champ texte libre en base (School.reseau
// est un String, pas un enum) pour ne pas casser les valeurs déjà en place
// (ex: "WBE") : les formulaires n'imposent cette liste que pour la saisie,
// cf. RESEAU_OPTIONS_WITH_LEGACY ci-dessous pour l'affichage d'une valeur
// existante qui n'en fait pas partie.
export const RESEAU_OPTIONS = [
  "Officiel (WBE)",
  "Officiel subventionné (CPEONS / CECP)",
  "Libre non confessionnel (FELSI)",
  "Écoles à programme belge à l'étranger (AEBE)",
  "Libre confessionnel catholique (SeGEC)",
  "Libre confessionnel islamique (ECIB)",
  "Libre confessionnel israélite",
  "Libre confessionnel orthodoxe",
  "Libre confessionnel protestant",
  "Hors réseau",
] as const;

// À utiliser pour un <select> qui édite une valeur déjà en base : si la
// valeur actuelle ne fait pas partie de la liste fermée (ex: "WBE" saisi
// avant l'introduction de ce menu), elle est ajoutée en tête pour ne pas la
// perdre silencieusement au prochain enregistrement du formulaire.
export function reseauOptionsWithLegacy(currentValue: string): readonly string[] {
  if (currentValue && !(RESEAU_OPTIONS as readonly string[]).includes(currentValue)) {
    return [currentValue, ...RESEAU_OPTIONS];
  }
  return RESEAU_OPTIONS;
}
