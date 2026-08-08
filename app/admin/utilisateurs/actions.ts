"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { AlreadyAnonymizedError, deleteAccount } from "@/lib/account-deletion";

export type AccountActionState = { error?: string; success?: string };

/// Supprime un compte (cf. lib/account-deletion.ts) : réellement s'il n'a
/// aucune trace collaborative, par anonymisation sinon.
/// Réservé au superadmin : c'est l'opération la plus irréversible du produit.
export async function deleteAccountAsAdmin(
  userId: string,
  returnTo: string,
  _prevState: AccountActionState | undefined,
  formData: FormData
): Promise<AccountActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);

  if (userId === session.userId) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return { error: "Compte introuvable." };

  // Garde-fou contre le clic accidentel : l'opération est irréversible, il
  // faut recopier l'adresse du compte visé.
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation.toLowerCase() !== user.email.toLowerCase()) {
    return { error: `Saisissez exactement « ${user.email} » pour confirmer la suppression.` };
  }

  let result;
  try {
    result = await deleteAccount(userId);
  } catch (error) {
    if (error instanceof AlreadyAnonymizedError) return { error: error.message };
    throw error;
  }

  // L'adresse libérée n'est volontairement PAS journalisée : la consigner
  // dans l'audit reconstituerait la donnée qu'on vient d'effacer.
  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.ANONYMIZE_ACCOUNT,
    targetType: "User",
    targetId: userId,
  });

  revalidatePath(returnTo);
  revalidatePath("/admin/utilisateurs");
  return {
    success:
      result.mode === "DELETED"
        ? `Compte entièrement supprimé de la base. L'adresse ${result.freedEmail} est de nouveau disponible.`
        : `Compte anonymisé : il avait déclaré ou validé des périodes, sa ligne est conservée pour ` +
          `le relevé de ses collègues. L'adresse ${result.freedEmail} est de nouveau disponible.`,
  };
}
