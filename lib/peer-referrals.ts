import type { PeriodType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { civilityAndLastName } from "@/lib/civility";
import { periodTypeLabel } from "@/lib/period-labels";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { getBaseUrl, sendPeerReferralEmail } from "@/lib/mailer";
import { generatePeerReferralToken, PEER_REFERRAL_TTL_MS } from "@/lib/peer-referral";

// Création d'un lien de parrainage, partagée par les deux endroits qui en
// émettent : la page dédiée (app/(app)/inviter) et la déclaration de période
// (app/(app)/declarer), où l'on invite les collègues sans compte présents à
// l'activité qu'on est en train de déclarer.

/// Période associée au parrainage, telle qu'elle apparaît dans l'email.
export type PeriodSummaryForInvite = {
  dateLabel: string;
  typeLabel: string;
  description: string;
};

/// Les deux champs du formulaire arrivent en listes parallèles, appariées par
/// leur rang (cf. components/colleague-invites-field.tsx). Une ligne sans
/// email est simplement oubliée : c'est une ligne ajoutée puis abandonnée,
/// pas une erreur à signaler — l'email est le seul champ indispensable, le
/// nom n'étant qu'un mémo pour l'expéditeur.
export function zipColleagueInvites(
  names: FormDataEntryValue[],
  emails: FormDataEntryValue[]
): { fullName: string | null; email: string }[] {
  return emails
    .map((email, i) => ({
      email: String(email).trim(),
      fullName: String(names[i] ?? "").trim() || null,
    }))
    .filter((invite) => invite.email !== "");
}

/// Crée le jeton et journalise. Le jeton brut n'est rendu qu'ici, dans le
/// lien : il n'est jamais relisible depuis la base (seul son hash y vit),
/// donc l'appelant doit l'afficher ou l'envoyer immédiatement.
export async function createPeerReferralLink(params: {
  schoolId: string;
  referredByMembershipId: string;
  actorUserId: string;
  periodId?: string | null;
  invitedName?: string | null;
}): Promise<{ referralId: string; link: string }> {
  const { rawToken, tokenHash } = generatePeerReferralToken();
  const referral = await prisma.peerReferral.create({
    data: {
      schoolId: params.schoolId,
      referredByMembershipId: params.referredByMembershipId,
      periodId: params.periodId ?? null,
      invitedName: params.invitedName ?? null,
      tokenHash,
      expiresAt: new Date(Date.now() + PEER_REFERRAL_TTL_MS),
    },
  });

  await logAudit({
    schoolId: params.schoolId,
    actorId: params.actorUserId,
    action: AuditAction.CREATE_PEER_REFERRAL,
    targetType: "PeerReferral",
    targetId: referral.id,
    metadata: { periodId: params.periodId ?? null },
  });

  const baseUrl = await getBaseUrl();
  return { referralId: referral.id, link: `${baseUrl}/rejoindre/parrainage/${rawToken}` };
}

/// Invite d'un coup les collègues sans compte saisis sur une période — à sa
/// déclaration (app/(app)/declarer) comme à sa modification
/// (app/(app)/mes-periodes) : le geste est le même des deux côtés, et son
/// contrat aussi. Chacun reçoit un lien rattaché à CETTE période, donc créer
/// son compte vaudra confirmation de sa participation.
///
/// Toujours appelé APRÈS l'écriture de la période : le lien porte son
/// identifiant. Best effort par invitation (cf. invitePeerByEmail) — un
/// email qui ne part pas ne doit pas faire perdre la période déjà écrite.
export async function inviteColleaguesOnPeriod(params: {
  formData: FormData;
  period: { id: string; date: Date; type: PeriodType; description: string };
  schoolId: string;
  schoolName: string;
  referredByMembershipId: string;
  actorUserId: string;
}): Promise<void> {
  const invites = zipColleagueInvites(
    params.formData.getAll("inviteeName"),
    params.formData.getAll("inviteeEmail")
  );
  if (invites.length === 0) return;

  const auteur = await prisma.user.findUnique({
    where: { id: params.actorUserId },
    select: { firstName: true, lastName: true, sex: true },
  });
  const periodPourEmail: PeriodSummaryForInvite = {
    dateLabel: params.period.date.toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    typeLabel: periodTypeLabel[params.period.type],
    description: params.period.description,
  };

  for (const invite of invites) {
    await invitePeerByEmail({
      to: invite.email,
      schoolId: params.schoolId,
      schoolName: params.schoolName,
      referredByMembershipId: params.referredByMembershipId,
      actorUserId: params.actorUserId,
      inviterCivility: auteur ? civilityAndLastName(auteur) : "Un·e collègue",
      periodId: params.period.id,
      period: periodPourEmail,
      invitedName: invite.fullName,
    });
  }
}

/// Crée le parrainage ET l'envoie par email. Best effort sur l'envoi, comme
/// les autres notifications de la plateforme : un SMTP injoignable ne doit
/// jamais faire échouer l'action qui l'a déclenché (ici, la déclaration d'une
/// période déjà écrite en base).
export async function invitePeerByEmail(params: {
  to: string;
  schoolId: string;
  schoolName: string;
  referredByMembershipId: string;
  actorUserId: string;
  inviterCivility: string;
  periodId?: string | null;
  period?: PeriodSummaryForInvite | null;
  invitedName?: string | null;
}): Promise<void> {
  try {
    const { link } = await createPeerReferralLink({
      schoolId: params.schoolId,
      referredByMembershipId: params.referredByMembershipId,
      actorUserId: params.actorUserId,
      periodId: params.periodId ?? null,
      invitedName: params.invitedName ?? null,
    });

    await sendPeerReferralEmail({
      to: params.to,
      inviterCivility: params.inviterCivility,
      schoolName: params.schoolName,
      period: params.period ?? null,
      joinUrl: link,
    });
  } catch (error) {
    console.error(`[peer-referral] Échec de l'invitation de ${params.to} :`, error);
  }
}
