"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import {
  assertCanRemoveMember,
  assertCanChangeMemberRole,
  ForbiddenError,
} from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type MemberActionState = { error?: string; success?: string };

export async function removeMember(
  _prevState: MemberActionState | undefined,
  formData: FormData
): Promise<MemberActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active." };

  const membershipId = formData.get("membershipId") as string;

  // Ne fait confiance qu'à une Membership réellement rattachée à l'école
  // active de l'acteur — un membershipId trafiqué d'une autre école tombe
  // simplement dans le "introuvable" ci-dessous.
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId: active.schoolId },
    include: { user: true },
  });
  if (!target) return { error: "Membre introuvable dans cette école." };

  try {
    await assertCanRemoveMember(session.userId, target.userId, active.schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  await prisma.membership.update({
    where: { id: target.id },
    data: { status: "REMOVED", removedAt: new Date() },
  });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.REMOVE_MEMBER,
    targetType: "Membership",
    targetId: target.id,
    metadata: { targetUserId: target.userId, targetEmail: target.user.email },
  });

  revalidatePath("/ecole/membres");
  return { success: "Membre retiré de l'école." };
}

const roleSchema = z.enum(["ENSEIGNANT", "REFERENT_NUMERIQUE"]); // jamais DIRECTION, même en entrée

export async function updateMemberRole(
  _prevState: MemberActionState | undefined,
  formData: FormData
): Promise<MemberActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active." };

  const membershipId = formData.get("membershipId") as string;
  const parsedRole = roleSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) return { error: "Rôle invalide." };

  const target = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId: active.schoolId },
  });
  if (!target) return { error: "Membre introuvable dans cette école." };

  try {
    await assertCanChangeMemberRole(session.userId, target.userId, active.schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  await prisma.membership.update({ where: { id: target.id }, data: { role: parsedRole.data } });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.UPDATE_MEMBER_ROLE,
    targetType: "Membership",
    targetId: target.id,
    metadata: { from: target.role, to: parsedRole.data },
  });

  revalidatePath("/ecole/membres");
  return { success: "Rôle mis à jour." };
}
