"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type OwnProfileState = { error?: string; success?: string };

const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
});

// Auto-gestion uniquement : l'acteur ne peut ici modifier QUE ses propres
// données (session.userId, jamais un identifiant fourni par le client) — pas
// de garde de rôle nécessaire, contrairement à updateMemberProfile qui gère
// le cas où une direction modifie le profil d'un·e collègue.
export async function updateOwnProfile(
  _prevState: OwnProfileState | undefined,
  formData: FormData
): Promise<OwnProfileState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const previous = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  try {
    await prisma.user.update({ where: { id: session.userId }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Cette adresse email est déjà utilisée par un autre compte." };
    }
    throw error;
  }

  const active = await resolveActiveMembership(session.userId);
  await logAudit({
    schoolId: active?.schoolId ?? null,
    actorId: session.userId,
    action: AuditAction.UPDATE_MEMBER_PROFILE,
    targetType: "User",
    targetId: session.userId,
    metadata: { previousEmail: previous.email, newEmail: parsed.data.email },
  });

  revalidatePath("/mon-profil");
  return { success: "Profil mis à jour." };
}
