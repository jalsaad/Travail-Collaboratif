import type { PeriodType, ParticipantStatus } from "@prisma/client";

export const periodTypeLabel: Record<PeriodType, string> = {
  REUNION_EQUIPE: "Réunion d'équipe",
  COLLABORATION_PEDAGOGIQUE: "Collaboration pédagogique",
};

export const participantStatusLabel: Record<ParticipantStatus, string> = {
  CONFIRMED: "confirmée",
  PENDING: "en attente",
  DECLINED: "refusée",
};
