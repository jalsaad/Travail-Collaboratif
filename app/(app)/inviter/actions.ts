"use server";

import { z } from "zod";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { getBaseUrl } from "@/lib/mailer";
import { generatePeerReferralToken, PEER_REFERRAL_TTL_MS } from "@/lib/peer-referral";

export type CreatePeerReferralState = { error?: string; link?: string; qrDataUrl?: string };

const schema = z.object({
  periodId: z.string().trim().transform((v) => v || null),
  invitedName: z
    .string()
    .trim()
    .max(80, "80 caractères maximum")
    .transform((v) => v || null),
});

export async function createPeerReferral(
  _prevState: CreatePeerReferralState | undefined,
  formData: FormData
): Promise<CreatePeerReferralState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active pour ce compte." };

  const parsed = schema.safeParse({
    periodId: formData.get("periodId") ?? "",
    invitedName: formData.get("invitedName") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Ne fait confiance qu'à une période où l'auteur de la demande est
  // réellement partie prenante à l'école active — défense contre un
  // periodId d'une autre école ou d'une période qui ne le concerne pas.
  let periodId: string | null = null;
  if (parsed.data.periodId) {
    const participation = await prisma.periodParticipant.findFirst({
      where: { periodId: parsed.data.periodId, userId: session.userId, membershipId: active.membershipId },
    });
    if (!participation) return { error: "Période introuvable pour votre compte." };
    periodId = parsed.data.periodId;
  }

  const { rawToken, tokenHash } = generatePeerReferralToken();
  const expiresAt = new Date(Date.now() + PEER_REFERRAL_TTL_MS);

  const referral = await prisma.peerReferral.create({
    data: {
      schoolId: active.schoolId,
      referredByMembershipId: active.membershipId,
      periodId,
      invitedName: parsed.data.invitedName,
      tokenHash,
      expiresAt,
    },
  });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.CREATE_PEER_REFERRAL,
    targetType: "PeerReferral",
    targetId: referral.id,
    metadata: { periodId },
  });

  const baseUrl = await getBaseUrl();
  const link = `${baseUrl}/rejoindre/parrainage/${rawToken}`;
  const qrDataUrl = await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1 });

  return { link, qrDataUrl };
}
