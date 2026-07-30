"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";
import { sendPasswordResetEmail, getBaseUrl } from "@/lib/mailer";

export type ForgotPasswordState = { success?: string; error?: string };

const schema = z.object({ email: z.string().email("Email invalide") });

const GENERIC_SUCCESS =
  "Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.";

export async function requestPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email invalide." };
  }

  const email = parsed.data.email.trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Message générique dans tous les cas (compte existant ou non) — jamais de
  // fuite d'existence de compte via ce formulaire.
  if (user) {
    // Une seule demande valide à la fois : les précédentes sont invalidées
    // plutôt que cumulées.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const { rawToken, tokenHash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const baseUrl = await getBaseUrl();
    const resetUrl = `${baseUrl}/reinitialiser-mot-de-passe?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  return { success: GENERIC_SUCCESS };
}
