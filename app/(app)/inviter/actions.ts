"use server";

import { z } from "zod";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { sendPeerReferralEmail } from "@/lib/mailer";
import { civilityAndLastName } from "@/lib/civility";
import { periodTypeLabel } from "@/lib/period-labels";
import { createPeerReferralLink } from "@/lib/peer-referrals";
import { demoErrorState } from "@/lib/demo-mode";

export type CreatePeerReferralState = { error?: string; link?: string; qrDataUrl?: string; emailSentTo?: string };

const schema = z.object({
  periodId: z.string().trim().transform((v) => v || null),
  invitedName: z
    .string()
    .trim()
    .max(80, "80 caractères maximum")
    .transform((v) => v || null),
  // Facultatif : sans email, le lien/QR reste affiché pour une remise en main
  // propre (cf. components/peer-referral-form.tsx).
  inviteeEmail: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: "Email invalide.",
    }),
});

async function createPeerReferralImpl(
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
    inviteeEmail: formData.get("inviteeEmail") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Ne fait confiance qu'à une période où l'auteur de la demande est
  // réellement partie prenante à l'école active — défense contre un
  // periodId d'une autre école ou d'une période qui ne le concerne pas.
  let periodId: string | null = null;
  let periodForEmail: { dateLabel: string; typeLabel: string; description: string } | null = null;
  if (parsed.data.periodId) {
    const participation = await prisma.periodParticipant.findFirst({
      where: { periodId: parsed.data.periodId, userId: session.userId, membershipId: active.membershipId },
      include: { period: { select: { date: true, type: true, description: true } } },
    });
    if (!participation) return { error: "Période introuvable pour votre compte." };
    periodId = parsed.data.periodId;
    periodForEmail = {
      dateLabel: participation.period.date.toLocaleDateString("fr-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      typeLabel: periodTypeLabel[participation.period.type],
      description: participation.period.description,
    };
  }

  const { link } = await createPeerReferralLink({
    schoolId: active.schoolId,
    referredByMembershipId: active.membershipId,
    actorUserId: session.userId,
    periodId,
    invitedName: parsed.data.invitedName,
  });
  const qrDataUrl = await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 1 });

  if (parsed.data.inviteeEmail) {
    const actor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, sex: true },
    });
    // Best effort, comme les autres notifications de la plateforme : un SMTP
    // injoignable ne doit pas faire perdre le lien déjà généré, toujours
    // affiché ci-dessous pour une remise manuelle en repli.
    try {
      await sendPeerReferralEmail({
        to: parsed.data.inviteeEmail,
        inviterCivility: actor ? civilityAndLastName(actor) : "Un·e collègue",
        schoolName: active.schoolName,
        period: periodForEmail,
        joinUrl: link,
      });
    } catch (error) {
      console.error("[peer-referral] Échec d'envoi de l'invitation par email :", error);
    }
    return { link, qrDataUrl, emailSentTo: parsed.data.inviteeEmail };
  }

  return { link, qrDataUrl };
}

// Le compte de démonstration ne peut rien écrire (cf. lib/demo-mode.ts) :
// on traduit le refus en message lisible plutôt qu'en page d'erreur.
export async function createPeerReferral(
  prevState: CreatePeerReferralState | undefined,
  formData: FormData
): Promise<CreatePeerReferralState> {
  try {
    return await createPeerReferralImpl(prevState, formData);
  } catch (error) {
    const demo = demoErrorState(error);
    if (demo) return demo;
    throw error;
  }
}
