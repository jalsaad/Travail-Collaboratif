import { prisma } from "@/lib/prisma";

// Suppression d'un compte, avec deux issues selon ce que la personne a laissé
// derrière elle.
//
// SANS TRACE COLLABORATIVE, la ligne est réellement supprimée. C'est le cas
// des comptes de test et des inscriptions abandonnées. Une réinscription avec
// la même adresse repart alors d'une ligne neuve : aucun doublon possible
// entre un compte actif et un compte supprimé.
//
// AVEC UNE TRACE, la ligne doit survivre : les périodes déclarées par
// quelqu'un sont le relevé légal de SES COLLÈGUES et alimentent leur quota
// annuel, et ses participations conditionnent la validation des périodes
// d'autrui. On efface alors les données personnelles et on libère l'email,
// ce qu'attend aussi une demande d'effacement RGPD.
//
// Dans ce second cas, une réinscription crée nécessairement une nouvelle
// ligne : l'email d'origine ayant été détruit, rien ne permet — ni ne doit
// permettre — de rattacher la nouvelle personne à l'ancien enregistrement.

/// Domaine réservé par la RFC 6761 : aucune adresse de remplacement ne peut
/// router vers une vraie boîte, même par accident.
export const ANONYMOUS_EMAIL_DOMAIN = "supprime.invalid";

export const ANONYMOUS_FIRST_NAME = "Compte";
export const ANONYMOUS_LAST_NAME = "supprimé";

/// L'identifiant garantit l'unicité, la colonne email étant unique.
export function anonymousEmailFor(userId: string): string {
  return `compte-supprime-${userId}@${ANONYMOUS_EMAIL_DOMAIN}`;
}

export function isAnonymizedEmail(email: string): boolean {
  return email.endsWith(`@${ANONYMOUS_EMAIL_DOMAIN}`);
}

export class AlreadyAnonymizedError extends Error {}

export type AccountDeletionResult = {
  /// DELETED : la ligne n'existe plus. ANONYMIZED : elle subsiste, vidée.
  mode: "DELETED" | "ANONYMIZED";
  freedEmail: string;
};

/// Le compte a-t-il laissé quelque chose dont d'autres dépendent, ou qu'une
/// clé étrangère restrictive empêche de supprimer ?
///
/// Les participations comptent : les effacer retirerait la personne des
/// périodes de ses collègues et pourrait faire basculer leur statut de
/// validation à leur insu.
async function hasCollaborativeTrace(userId: string): Promise<boolean> {
  const counts = await Promise.all([
    prisma.collaborativePeriod.count({ where: { createdByUserId: userId } }),
    prisma.periodParticipant.count({ where: { userId } }),
    prisma.invitation.count({ where: { invitedById: userId } }),
    prisma.exportLog.count({ where: { requestedById: userId } }),
    prisma.announcement.count({ where: { createdById: userId } }),
    prisma.donation.count({ where: { userId } }),
  ]);
  return counts.some((n) => n > 0);
}

/// Supprime un compte : réellement s'il n'a aucune trace, par anonymisation
/// sinon. Retourne l'adresse libérée et l'issue retenue.
export async function deleteAccount(userId: string): Promise<AccountDeletionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Compte introuvable.");
  if (isAnonymizedEmail(user.email)) {
    throw new AlreadyAnonymizedError("Ce compte a déjà été supprimé.");
  }

  if (!(await hasCollaborativeTrace(userId))) {
    await prisma.$transaction([
      // Seule référence restrictive restante à ce stade : l'inscription écrit
      // une ligne d'audit dont ce compte est l'acteur. Les rattachements,
      // jetons, tickets et accusés de lecture partent en cascade.
      prisma.auditLog.deleteMany({ where: { actorId: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return { mode: "DELETED", freedEmail: user.email };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymousEmailFor(userId),
        firstName: ANONYMOUS_FIRST_NAME,
        lastName: ANONYMOUS_LAST_NAME,
        // passwordHash à null : verifyCredentials refuse la connexion sans
        // hash, le compte devient inaccessible.
        passwordHash: null,
        dateOfBirth: null,
        sex: null,
        matricule: null,
        satisfactionRating: null,
        satisfactionRatedAt: null,
        // Garde-fou : un compte supprimé ne doit en aucun cas conserver
        // l'accès à l'administration plateforme.
        isSuperAdmin: false,
      },
    }),

    // Les rattachements passent en retiré : la personne disparaît des listes
    // de membres et des sélecteurs de collègues.
    prisma.membership.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "REMOVED", removedAt: new Date() },
    }),

    // Un lien de réinitialisation encore valide ressusciterait le compte.
    prisma.passwordResetToken.deleteMany({ where: { userId } }),

    // Un lien de validation encore valide permettrait de confirmer une
    // participation au nom d'un compte supprimé.
    prisma.participationToken.deleteMany({
      where: { periodParticipant: { userId }, usedAt: null },
    }),
  ]);

  return { mode: "ANONYMIZED", freedEmail: user.email };
}
