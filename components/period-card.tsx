import Link from "next/link";
import type {
  CollaborativePeriod,
  PeriodParticipant,
  User,
  Membership,
  School,
} from "@prisma/client";
import { computePeriodStatus } from "@/lib/period-status";
import { periodTypeLabel, participantStatusLabel } from "@/lib/period-labels";
import { formatPeriodSchedule } from "@/lib/period-duration";
import { collaborativeActivityLabel } from "@/lib/collaborative-activities";
import { ParticipationActions } from "@/components/participation-actions";
import { DeletePeriodButton } from "@/components/delete-period-button";
import { Reveal } from "@/components/reveal";

type ParticipantWithRelations = PeriodParticipant & {
  user: User;
  membership: Membership & { school: School };
};

type PeriodWithParticipants = CollaborativePeriod & {
  participants: ParticipantWithRelations[];
};

export function PeriodCard({
  period,
  currentUserId,
  index = 0,
}: {
  period: PeriodWithParticipants;
  currentUserId: string;
  index?: number;
}) {
  const status = computePeriodStatus(period.participants);
  const myParticipation = period.participants.find((p) => p.userId === currentUserId);

  return (
    <Reveal
      delay={Math.min(index, 6) * 70}
      className="card p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/15"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            {periodTypeLabel[period.type] ?? period.type}
          </p>
          {collaborativeActivityLabel(period.natureActivite) && (
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              {collaborativeActivityLabel(period.natureActivite)}
            </p>
          )}
          <p className="mt-1.5 text-sm text-stone-900 dark:text-stone-100">{period.description}</p>
          {period.objectifsPilotage && (
            <p className="mt-1 text-xs italic text-stone-500 dark:text-stone-400">
              Plan de pilotage : {period.objectifsPilotage}
            </p>
          )}
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            {new Date(period.date).toLocaleDateString("fr-BE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            ·{" "}
            {formatPeriodSchedule(
              period.heureDebut,
              period.heureFin,
              period.dureePeriodes.toString()
            )}
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
            {p.membership.school && ` (${p.membership.school.name})`}
            {p.isInitiator && " · initiateur·rice"} — {participantStatusLabel[p.status]}
          </li>
        ))}
      </ul>

      {myParticipation && myParticipation.status === "PENDING" && (
        <div className="mt-4">
          <ParticipationActions periodId={period.id} />
        </div>
      )}

      {period.createdByUserId === currentUserId && (
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3.5 dark:border-stone-800">
          <Link
            href={`/mes-periodes/${period.id}/modifier`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Modifier
          </Link>
          <DeletePeriodButton periodId={period.id} />
        </div>
      )}
    </Reveal>
  );
}
