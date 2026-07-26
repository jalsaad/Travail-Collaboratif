import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/role-labels";

export class ForbiddenError extends Error {}

// Invariant central : le rôle de l'acteur est toujours re-vérifié en base au
// moment de l'action, jamais lu depuis session.memberships (snapshot JWT pris
// à la connexion, potentiellement périmé si le rôle a changé depuis).
export async function assertCanManageSchool(userId: string, schoolId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
    include: { school: { select: { status: true } } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new ForbiddenError("Aucun rattachement actif à cette école.");
  }
  if (membership.role !== "DIRECTION" && membership.role !== "REFERENT_NUMERIQUE") {
    throw new ForbiddenError("Droits de gestion requis.");
  }
  // Défense en profondeur : une école pas encore validée par la plateforme
  // ne peut faire l'objet d'aucune action de gestion, même si l'appelant
  // contourne la garde de layout (app/(app)/layout.tsx).
  if (membership.school.status !== "APPROVED") {
    throw new ForbiddenError("Cette école n'est pas encore validée par la plateforme.");
  }
  return membership;
}

export async function assertCanEditMemberProfile(
  actorUserId: string,
  targetUserId: string,
  schoolId: string
) {
  if (actorUserId === targetUserId) return null; // chacun gère toujours ses propres données

  await assertCanManageSchool(actorUserId, schoolId);
  const target = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: targetUserId, schoolId } },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new ForbiddenError("Cette personne n'est pas membre active de cette école.");
  }
  if (target.isAccountOwner) {
    throw new ForbiddenError("Le titulaire du compte ne peut modifier que ses propres données.");
  }
  return target;
}

export async function assertCanRemoveMember(
  actorUserId: string,
  targetUserId: string,
  schoolId: string
) {
  await assertCanManageSchool(actorUserId, schoolId);
  const target = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: targetUserId, schoolId } },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new ForbiddenError("Cette personne n'est pas membre active de cette école.");
  }
  if (target.isAccountOwner) {
    throw new ForbiddenError("Le titulaire du compte ne peut pas être retiré.");
  }
  return target;
}

// Garde non décrite littéralement par permissions.md (qui ne couvre la règle
// promote/demote qu'en prose dans la matrice) — même base que
// assertCanRemoveMember, plus un verrou explicite sur le rôle DIRECTION
// lui-même : défense en profondeur si une école venait à avoir plusieurs
// Membership en rôle DIRECTION dont une seule isAccountOwner (le modèle ne
// l'interdit pas).
export async function assertCanChangeMemberRole(
  actorUserId: string,
  targetUserId: string,
  schoolId: string
) {
  await assertCanManageSchool(actorUserId, schoolId);
  const target = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: targetUserId, schoolId } },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new ForbiddenError("Cette personne n'est pas membre active de cette école.");
  }
  if (target.isAccountOwner || target.role === "DIRECTION") {
    throw new ForbiddenError(`Le rôle ${roleLabel.DIRECTION} ne peut pas être modifié depuis cet écran.`);
  }
  return target;
}
