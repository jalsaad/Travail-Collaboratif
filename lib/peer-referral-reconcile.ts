import { prisma, type AppTransactionClient } from "@/lib/prisma";
import { logAudit, AuditAction } from "@/lib/audit-log";

// RATTACHEMENT DES PARTICIPATIONS DÉJÀ DÉCLARÉES.
//
// Quand un enseignant déclare une période avec un collègue qui n'a pas encore
// de compte, la participation de ce collègue n'existe pas encore : seul part
// un PeerReferral porteur du periodId (cf. lib/peer-referrals.ts). Elle était
// jusqu'ici créée au SEUL endroit où ce lien précis est ouvert — la création
// de compte par parrainage.
//
// Tout autre chemin la perdait en silence, et c'est le chemin le plus
// fréquent : la personne s'inscrit avec le code de rattachement que sa
// direction a diffusé, le lien reçu par email ne sert jamais, et plus rien
// n'établit le rapprochement. Côté enseignante, aucune période à valider —
// elle n'a rien à accepter, puisqu'aucune ligne ne la concerne. Côté auteur,
// la période s'affichait même « validée », faute de participant en attente.
// Et les périodes manquaient à son obligation annuelle, le compteur ne
// sommant que des PeriodParticipant (cf. lib/collaboration-progress.ts).

/// Une seule règle de comparaison des adresses pour tout ce fichier : la
/// casse des emails n'est pas normalisée à l'inscription, on ne peut donc pas
/// s'en remettre à une égalité SQL stricte.
function memeAdresse(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/// Parrainages de cette école encore ouverts et porteurs d'une période.
///
/// L'EXPIRATION N'EST PAS FILTRÉE. Elle protège le lien — un secret qui dort
/// dans une boîte mail — et on ne s'appuie ici sur aucun lien : la personne
/// est déjà entrée par un chemin légitime, et ce qui fonde le rattachement,
/// c'est qu'un collègue a nommément déclaré cette adresse comme présente à
/// son activité. Ce fait-là ne périme pas.
async function parrainagesOuverts(schoolId: string, email: string) {
  const ouverts = await prisma.peerReferral.findMany({
    where: { schoolId, usedAt: null, periodId: { not: null } },
    select: { id: true, periodId: true, invitedEmail: true },
  });
  return ouverts.filter((r) => memeAdresse(r.invitedEmail, email));
}

/// Rattache à ce membre les participations déclarées pour lui avant qu'il
/// n'ait de compte dans cette école. Rend le nombre de périodes rattachées.
///
/// À appeler APRÈS la création (ou la réactivation) de la Membership, sur
/// TOUS les chemins d'entrée dans une école — sans quoi le défaut réapparaît
/// par le chemin oublié. Best effort : une période qui ne se rattache pas ne
/// doit jamais faire échouer l'inscription elle-même, qui est l'essentiel.
export async function reconcilePeerReferralsForMember(params: {
  userId: string;
  membershipId: string;
  schoolId: string;
  email: string;
}): Promise<number> {
  let referrals: { id: string; periodId: string | null }[];
  try {
    referrals = await parrainagesOuverts(params.schoolId, params.email);
  } catch (error) {
    console.error("[peer-referral] Échec de la recherche des parrainages ouverts :", error);
    return 0;
  }
  if (referrals.length === 0) return 0;

  const rattachees: string[] = [];
  for (const referral of referrals) {
    const periodId = referral.periodId;
    if (!periodId) continue;
    try {
      const fait = await prisma.$transaction(async (tx) => {
        // Le jeton est RÉSERVÉ d'abord, et seulement s'il est encore ouvert :
        // deux rattachements concurrents (double soumission, ou ce chemin et
        // l'ouverture du lien en même temps) ne peuvent pas aboutir tous les
        // deux. Un updateMany plutôt qu'un update : il rend le nombre de
        // lignes touchées, c'est ce compte qui sert de verrou.
        const reserve = await tx.peerReferral.updateMany({
          where: { id: referral.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (reserve.count === 0) return false;

        // EN ATTENTE, jamais confirmée d'office. Ouvrir le lien de parrainage
        // vaut accord — c'est un geste (cf.
        // app/(auth)/rejoindre/parrainage/[token]/actions.ts) ; arriver par un
        // autre chemin n'en est pas un, et personne ne doit se retrouver
        // engagé par ce qu'un collègue a déclaré sans l'avoir validé.
        // skipDuplicates : @@unique([periodId, userId]) — une participation
        // déjà présente rend l'opération inutile, pas fautive.
        await tx.periodParticipant.createMany({
          data: [
            {
              periodId,
              userId: params.userId,
              membershipId: params.membershipId,
              status: "PENDING" as const,
            },
          ],
          skipDuplicates: true,
        });
        return true;
      });
      if (fait) rattachees.push(periodId);
    } catch (error) {
      console.error(`[peer-referral] Échec du rattachement de la période ${periodId} :`, error);
    }
  }

  if (rattachees.length > 0) {
    await logAudit({
      schoolId: params.schoolId,
      actorId: params.userId,
      action: AuditAction.RECONCILE_PEER_REFERRAL,
      targetType: "Membership",
      targetId: params.membershipId,
      metadata: { periodIds: rattachees },
    });
  }

  return rattachees.length;
}

/// Consomme les parrainages de CETTE période adressés à des personnes qui y
/// figurent désormais comme participantes.
///
/// Sert le dépannage manuel : l'auteur rouvre sa période et coche la collègue
/// entre-temps inscrite (cf. app/(app)/mes-periodes/actions.ts). Sans cela,
/// l'invitation resterait ouverte pour quelqu'un qui participe déjà, et la
/// période porterait indéfiniment la mention « compte pas encore créé ».
///
/// Dans la transaction de l'appelant : le parrainage ne doit se fermer que si
/// la participation qui le rend inutile est bien écrite.
export async function consumePeerReferralsForPeriod(
  tx: AppTransactionClient,
  periodId: string,
  emails: (string | null)[]
): Promise<void> {
  const ouverts = await tx.peerReferral.findMany({
    where: { periodId, usedAt: null },
    select: { id: true, invitedEmail: true },
  });
  const aFermer = ouverts
    .filter((r) => emails.some((email) => memeAdresse(r.invitedEmail, email)))
    .map((r) => r.id);
  if (aFermer.length === 0) return;

  await tx.peerReferral.updateMany({
    where: { id: { in: aFermer } },
    data: { usedAt: new Date() },
  });
}
