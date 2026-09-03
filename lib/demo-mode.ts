// Compte de démonstration : une direction qui découvre la plateforme peut
// tout consulter et remplir les formulaires, mais rien n'est jamais écrit —
// l'espace reste donc identique pour le visiteur suivant, sans remise à zéro
// périodique ni copie par visiteur.
//
// Le blocage vit dans le client Prisma (cf. lib/prisma.ts) plutôt que dans
// chaque action serveur : c'est le seul endroit que TOUTE écriture traverse,
// donc le seul qui couvre aussi les fonctionnalités qu'on ajoutera ensuite
// sans y repenser.

/// Identifiants du compte partagé, écrits ici une seule fois : le script qui
/// monte la démo (scripts/creer-demo.ts) et le formulaire de connexion qui les
/// pré-remplit (app/(auth)/login/direction) lisent la même source, pour qu'ils
/// ne puissent pas diverger. Ce compte ne peut rien écrire, les publier est
/// donc sans conséquence — c'est même le but.
export const DEMO_EMAIL = "demo@travail-collaboratif.be";
export const DEMO_PASSWORD = "demo2026";

/// Message montré à la direction quand elle tente d'enregistrer. Volontairement
/// explicite sur la cause ET sur ce qui n'a pas eu lieu.
export const DEMO_WRITE_MESSAGE =
  "Espace de démonstration : votre modification n'a pas été enregistrée. Tout le reste fonctionne normalement — inscrivez votre école pour disposer d'un espace réel.";

export class DemoModeError extends Error {
  constructor() {
    super(DEMO_WRITE_MESSAGE);
    this.name = "DemoModeError";
  }
}

/// Traduit l'erreur en message d'état pour les actions qui répondent par
/// `{ error }` — les seules à pouvoir afficher un texte lisible, Next.js
/// masquant en production le message des exceptions serveur non rattrapées.
export function demoErrorState(error: unknown): { error: string } | null {
  return error instanceof DemoModeError ? { error: DEMO_WRITE_MESSAGE } : null;
}

/// Opérations Prisma qui modifient l'état. Tout le reste (findMany, count,
/// aggregate…) reste autorisé : la démo doit se consulter normalement.
const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
  "executeRaw",
  "executeRawUnsafe",
  "queryRaw",
  "queryRawUnsafe",
]);

export function isWriteOperation(operation: string): boolean {
  return WRITE_OPERATIONS.has(operation);
}
