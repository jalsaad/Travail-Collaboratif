import { AsyncLocalStorage } from "node:async_hooks";

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
/// Long et propre à la plateforme, non par souci de secret — il est affiché et
/// pré-rempli — mais parce que Chrome compare chaque mot de passe saisi aux
/// corpus de fuites : « demo2026 » y figurait, et une direction qui découvrait
/// l'outil recevait aussitôt un avertissement de violation de données. Ce
/// compte ne peut rien écrire, sa robustesse n'a donc aucune importance ; seule
/// compte l'absence d'alerte.
export const DEMO_PASSWORD = "DemoTravailCollaboratif-2026-visite";

/// Compte enseignant de la même école fictive, pour visiter l'espace Profs
/// sans passer par une direction (cf. scripts/creer-demo.ts).
///
/// Julie Moreau plutôt qu'un autre profil : elle a déclaré une période et
/// participe à deux autres, son espace n'est donc pas vide, et son 0,8 ETP
/// montre un objectif proratisé (43,64 périodes) au lieu du temps plein qui
/// laisserait croire à une règle unique. Même mot de passe que le compte
/// direction, et même interdiction d'écrire.
export const DEMO_TEACHER_EMAIL = "j.moreau@demo.travail-collaboratif.be";

/// Message montré à la direction quand elle tente d'enregistrer. Volontairement
/// explicite sur la cause ET sur ce qui n'a pas eu lieu.
export const DEMO_WRITE_MESSAGE =
  "Espace de démonstration : votre modification n'a pas été enregistrée. Tout le reste fonctionne normalement — inscrivez votre école pour disposer d'un espace réel.";

/// Parcours PUBLICS — créer l'espace de son école, rejoindre une école,
/// réinitialiser son mot de passe, valider une participation reçue par email.
///
/// Le verrou de la démo ne doit pas s'y appliquer : la personne y agit en son
/// nom propre, pas dans l'espace fictif. Le cas s'est produit en production —
/// une direction qui venait de visiter la démo a cliqué sur « Inscrire mon
/// école » ; le cookie de démonstration était toujours là, l'écriture a été
/// refusée, et la création s'est terminée sur une page d'erreur (01/10/2026).
///
/// AsyncLocalStorage plutôt qu'un drapeau de module : chaque requête a son
/// propre contexte, deux visiteurs simultanés ne peuvent donc pas se
/// déverrouiller l'un l'autre.
const parcoursPublic = new AsyncLocalStorage<true>();

/// Exécute une inscription ou une réinitialisation sans le verrou de la démo.
export function horsDemo<T>(action: () => Promise<T>): Promise<T> {
  return parcoursPublic.run(true, action);
}

export function estParcoursPublic(): boolean {
  return parcoursPublic.getStore() === true;
}

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

/// Exécute une écriture ACCESSOIRE en tolérant qu'elle soit refusée en
/// démonstration : une trace d'export, un horodatage de connexion, une
/// préférence d'affichage. Ces écritures accompagnent un geste dont le
/// résultat utile est ailleurs (le PDF est déjà produit, la session est déjà
/// ouverte) — les laisser échouer transformerait un bouton parfaitement
/// fonctionnel en cul-de-sac, alors que la démonstration promet l'inverse :
/// tout fonctionne, rien ne s'enregistre.
///
/// À ne PAS utiliser pour l'écriture qui EST le but du geste (déclarer une
/// période, inviter un membre) : là, le refus doit se voir, et les actions
/// concernées l'affichent via demoErrorState.
export async function tolerateDemoWrite(ecriture: () => Promise<unknown>): Promise<void> {
  try {
    await ecriture();
  } catch (error) {
    // Toute autre panne remonte : on ne masque que le refus de la démo.
    if (!(error instanceof DemoModeError)) throw error;
  }
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
