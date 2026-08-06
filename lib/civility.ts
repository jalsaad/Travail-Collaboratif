import type { Sex } from "@prisma/client";

/// « Madame Dubois », « Monsieur Lefèvre », ou le nom complet quand le sexe
/// n'est pas renseigné (User.sex est nullable : les comptes créés avant
/// l'introduction du champ n'en ont pas). On ne devine jamais la civilité à
/// partir du prénom — mieux vaut un nom complet neutre qu'un titre erroné.
export function civilityAndLastName(user: {
  firstName: string;
  lastName: string;
  sex: Sex | null;
}): string {
  if (user.sex === "F") return `Madame ${user.lastName}`;
  if (user.sex === "M") return `Monsieur ${user.lastName}`;
  return `${user.firstName} ${user.lastName}`;
}
