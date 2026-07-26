"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { CollaborativePeriod, PeriodParticipant, User } from "@prisma/client";
import { computePeriodStatus } from "@/lib/period-status";
import { periodTypeLabel, participantStatusLabel } from "@/lib/period-labels";
import { deletePeriodAsAdmin } from "@/app/admin/periodes/[periodId]/actions";

type ParticipantWithUser = PeriodParticipant & { user: User };
// `dureePeriodes` (Prisma Decimal) n'est pas un objet serializable au
// franchissement Server -> Client Component — le composant appelant doit le
// convertir en string (cf. .toString()) avant de nous le transmettre.
type PeriodWithParticipants = Omit<CollaborativePeriod, "dureePeriodes"> & {
  dureePeriodes: string;
  participants: ParticipantWithUser[];
};

export function AdminPeriodList({
  periods,
  schoolId,
}: {
  periods: PeriodWithParticipants[];
  schoolId: string;
}) {
  const [pending, startTransition] = useTransition();

  function remove(periodId: string) {
    if (!window.confirm("Supprimer définitivement cette période ?")) return;
    startTransition(() => {
      deletePeriodAsAdmin(periodId, schoolId);
    });
  }

  if (periods.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Aucune période déclarée pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {periods.map((period) => {
        const status = computePeriodStatus(period.participants);
        return (
          <article key={period.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {periodTypeLabel[period.type] ?? period.type}
                </p>
                <p className="mt-1.5 text-sm text-stone-900 dark:text-stone-100">{period.description}</p>
                <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                  {new Date(period.date).toLocaleDateString("fr-BE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {period.dureePeriodes.toString()} période(s)
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  status === "validee"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {status === "validee" ? "Validée" : "En attente"}
              </span>
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-1.5">
              {period.participants.map((p) => (
                <li
                  key={p.id}
                  className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  {p.user.firstName} {p.user.lastName}
                  {p.isInitiator && " · initiateur·rice"} — {participantStatusLabel[p.status]}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3.5 dark:border-stone-800">
              <Link
                href={`/admin/periodes/${period.id}/modifier?schoolId=${schoolId}`}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Modifier
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(period.id)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                {pending ? "..." : "Supprimer"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
