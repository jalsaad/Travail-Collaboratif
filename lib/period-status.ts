import type { ParticipantStatus } from "@prisma/client";

export type PeriodStatus = "validee" | "attente";

/// Statut affiché d'une période.
///
/// `invitationsEnAttente` compte les parrainages de cette période encore
/// ouverts, c'est-à-dire les collègues nommés à la déclaration alors qu'ils
/// n'avaient pas de compte et qui n'ont toujours pas de participation (cf.
/// lib/peer-referral-reconcile.ts). Ils n'ont aucun PeriodParticipant : sans
/// ce second argument, la période s'affichait « validée » parce que tous les
/// participants PRÉSENTS l'avaient confirmée — l'absence même de la personne
/// attendue la faisait passer pour complète. C'est ce qui a rendu le défaut
/// invisible des deux côtés pendant des mois.
///
/// Par défaut 0, pour les appelants qui n'ont pas chargé les parrainages et
/// ne se prononcent que sur les participations.
export function computePeriodStatus(
  participants: { status: ParticipantStatus }[],
  invitationsEnAttente = 0
): PeriodStatus {
  if (invitationsEnAttente > 0) return "attente";
  return participants.every((p) => p.status === "CONFIRMED") ? "validee" : "attente";
}
