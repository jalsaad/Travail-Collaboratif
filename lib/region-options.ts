// Zones administratives de la Fédération Wallonie-Bruxelles — liste fermée
// fournie par l'utilisateur. Reste un champ texte libre en base
// (School.region est un String, pas un enum) pour ne pas casser les valeurs
// déjà en place, même logique que RESEAU_OPTIONS (cf. lib/reseau-options.ts).
export const REGION_OPTIONS = [
  "Bruxelles (Zone 1)",
  "Brabant wallon (Zone 2)",
  "Huy-Waremme (Zone 3)",
  "Liège (Zone 4)",
  "Verviers (Zone 5)",
  "Namur (Zone 6)",
  "Luxembourg (Zone 7)",
  "Wallonie Picarde (Zone 8)",
  "Hainaut Centre (Zone 9)",
  "Hainaut Sud (Zone 10)",
  "Hors territoire belge",
] as const;

// À utiliser pour un <select> qui édite une valeur déjà en base : si la
// valeur actuelle ne fait pas partie de la liste fermée, elle est ajoutée en
// tête pour ne pas la perdre silencieusement au prochain enregistrement du
// formulaire — même logique que reseauOptionsWithLegacy.
export function regionOptionsWithLegacy(currentValue: string): readonly string[] {
  if (currentValue && !(REGION_OPTIONS as readonly string[]).includes(currentValue)) {
    return [currentValue, ...REGION_OPTIONS];
  }
  return REGION_OPTIONS;
}
