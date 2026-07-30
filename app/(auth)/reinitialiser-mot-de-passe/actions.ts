"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type ResetPasswordState = { error?: string };

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "8 caractères minimum"),
    passwordConfirmation: z.string().min(8, "8 caractères minimum"),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

const INVALID_TOKEN_ERROR = "Ce lien de réinitialisation n'est plus valide. Demandez-en un nouveau.";

export async function resetPassword(
  _prevState: ResetPasswordState | undefined,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // Même message générique pour token inconnu, déjà utilisé ou expiré — ne
  // distingue jamais la raison précise.
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: INVALID_TOKEN_ERROR };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  await logAudit({
    schoolId: null,
    actorId: resetToken.userId,
    action: AuditAction.RESET_PASSWORD,
    targetType: "User",
    targetId: resetToken.userId,
  });

  try {
    await signIn("credentials", {
      email: resetToken.user.email,
      password: parsed.data.password,
      redirectTo: "/mes-periodes",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Mot de passe modifié, mais connexion automatique impossible. Merci de vous connecter.",
      };
    }
    throw error; // laisse passer la redirection interne de signIn en cas de succès
  }
}
