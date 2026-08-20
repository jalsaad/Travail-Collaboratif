import type { ProspectionStatus } from "@prisma/client";

export const PROSPECTION_STATUSES: { value: ProspectionStatus; label: string; badge: string }[] = [
  {
    value: "A_CONTACTER",
    label: "À contacter",
    badge: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  },
  {
    value: "CONTACTEE",
    label: "Contactée",
    badge: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  },
  {
    value: "RELANCEE",
    label: "Relancée",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    value: "REFUS",
    label: "Refus",
    badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
];

const PAR_VALEUR = new Map(PROSPECTION_STATUSES.map((s) => [s.value, s]));

export function prospectionLabel(status: ProspectionStatus): string {
  return PAR_VALEUR.get(status)?.label ?? status;
}

export function prospectionBadge(status: ProspectionStatus): string {
  return PAR_VALEUR.get(status)?.badge ?? "";
}
