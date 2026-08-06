import { prisma } from "@/lib/prisma";
import { periodTypeLabel } from "@/lib/period-labels";
import { formatPeriodes, formatTimeRange } from "@/lib/period-duration";
import { civilityAndLastName } from "@/lib/civility";
import {
  generateParticipationToken,
  PARTICIPATION_TOKEN_TTL_MS,
} from "@/lib/participation-token";
import { getBaseUrl, sendParticipationInvitationEmail } from "@/lib/mailer";

// Prévient par email les participants encore en attente sur une période :
// à la création (invitation initiale) comme après une modification, qui remet
// tout le monde en attente de revalidation.
//
// Volontairement tolérant aux pannes : un SMTP injoignable ne doit jamais
// faire échouer la déclaration elle-même, déjà écrite en base. L'échec est
// journalisé et la validation reste possible depuis la plateforme.
export async function notifyPendingParticipants(periodId: string): Promise<void> {
  try {
    const period = await prisma.collaborativePeriod.findUnique({
      where: { id: periodId },
      include: {
        createdBy: { select: { firstName: true, lastName: true, sex: true } },
        participants: {
          include: {
            user: { select: { id: true, email: true } },
            membership: { include: { school: { select: { name: true } } } },
          },
        },
      },
    });
    if (!period) return;

    // Ni l'initiateur·rice (sa propre participation est confirmée d'office),
    // ni celles et ceux qui ont déjà répondu.
    const recipients = period.participants.filter(
      (p) => p.status === "PENDING" && p.userId !== period.createdByUserId
    );
    if (recipients.length === 0) return;

    const baseUrl = await getBaseUrl();
    const inviterCivility = civilityAndLastName(period.createdBy);
    const dureePeriodes = formatPeriodes(period.dureePeriodes.toString());
    const dateLabel = period.date.toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const horaire = formatTimeRange(period.heureDebut, period.heureFin);
    const expiresAt = new Date(Date.now() + PARTICIPATION_TOKEN_TTL_MS);

    for (const participant of recipients) {
      // Un jeton par envoi : les précédents de CE participant sont invalidés,
      // pour qu'un ancien email ne puisse pas valider une version modifiée
      // de la période que la personne n'a jamais vue.
      const { rawToken, tokenHash } = generateParticipationToken();
      await prisma.$transaction([
        prisma.participationToken.deleteMany({
          where: { periodParticipantId: participant.id, usedAt: null },
        }),
        prisma.participationToken.create({
          data: { periodParticipantId: participant.id, tokenHash, expiresAt },
        }),
      ]);

      await sendParticipationInvitationEmail({
        to: participant.user.email,
        inviterCivility,
        dureePeriodes,
        dateLabel,
        horaire,
        typeLabel: periodTypeLabel[period.type] ?? period.type,
        description: period.description,
        schoolName: participant.membership.school.name,
        confirmUrl: `${baseUrl}/valider/${rawToken}`,
        platformUrl: baseUrl,
      });
    }
  } catch (error) {
    console.error(`[participation] Échec de notification pour la période ${periodId} :`, error);
  }
}
