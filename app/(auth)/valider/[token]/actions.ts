"use server";

import { prisma } from "@/lib/prisma";
import { hashParticipationToken } from "@/lib/participation-token";

export type TokenActionState = { error?: string; done?: "CONFIRMED" | "DECLINED" };

// Répond à une invitation depuis le lien reçu par email, SANS connexion.
//
// La sécurité repose entièrement sur le jeton : imprévisible (32 octets
// aléatoires), stocké haché, à usage unique et expirant. On ne consulte
// jamais la session ici — la personne qui détient le lien est, par
// construction, celle qui a reçu l'email à son adresse.
async function respond(
  rawToken: string,
  status: "CONFIRMED" | "DECLINED"
): Promise<TokenActionState> {
  const token = await prisma.participationToken.findUnique({
    where: { tokenHash: hashParticipationToken(rawToken) },
    include: { periodParticipant: true },
  });

  if (!token) return { error: "Ce lien n'est pas valide." };
  if (token.usedAt) return { error: "Ce lien a déjà été utilisé." };
  if (token.expiresAt < new Date()) {
    return {
      error:
        "Ce lien a expiré. Connectez-vous à la plateforme pour valider votre participation depuis « Mes périodes ».",
    };
  }

  // Le jeton est consommé dans la même transaction que la réponse : deux
  // clics simultanés ne peuvent pas produire deux écritures.
  await prisma.$transaction([
    prisma.participationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.periodParticipant.update({
      where: { id: token.periodParticipantId },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
      },
    }),
  ]);

  return { done: status };
}

export async function confirmByToken(
  rawToken: string,
  _prev: TokenActionState | undefined
): Promise<TokenActionState> {
  return respond(rawToken, "CONFIRMED");
}

export async function declineByToken(
  rawToken: string,
  _prev: TokenActionState | undefined
): Promise<TokenActionState> {
  return respond(rawToken, "DECLINED");
}
