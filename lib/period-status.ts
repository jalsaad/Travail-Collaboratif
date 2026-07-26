import type { ParticipantStatus } from "@prisma/client";

export type PeriodStatus = "validee" | "attente";

export function computePeriodStatus(participants: { status: ParticipantStatus }[]): PeriodStatus {
  return participants.every((p) => p.status === "CONFIRMED") ? "validee" : "attente";
}
