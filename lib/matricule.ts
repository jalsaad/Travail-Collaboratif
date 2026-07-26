// Numéro de matricule à 11 chiffres : 1 chiffre sexe + 2 chiffres décennie de
// naissance + 2 chiffres mois + 2 chiffres jour + 4 chiffres encodés
// manuellement par l'utilisateur.
//
// dateOfBirthIso est repris tel quel de l'input <input type="date"> au format
// "YYYY-MM-DD" — on en extrait les chiffres directement par découpage de
// chaîne plutôt que via un objet Date, pour ne jamais risquer un décalage
// d'un jour dû au fuseau horaire du serveur.
export function computeMatricule(
  sex: "M" | "F",
  dateOfBirthIso: string,
  manualDigits: string
): string {
  const [year, month, day] = dateOfBirthIso.split("-");
  const sexDigit = sex === "M" ? "1" : "2";
  return `${sexDigit}${year.slice(-2)}${month}${day}${manualDigits}`;
}

export const MATRICULE_MANUAL_PATTERN = /^\d{4}$/;
