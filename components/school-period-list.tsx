import type {
  CollaborativePeriod,
  ExternalParticipant,
  PeriodParticipant,
  User,
} from "@prisma/client";
import { computePeriodStatus } from "@/lib/period-status";
import { periodTypeLabel, participantStatusLabel } from "@/lib/period-labels";
import { formatPeriodSchedule } from "@/lib/period-duration";
import { collaborativeActivityLabel } from "@/lib/collaborative-activities";
import { ExternalParticipantChips } from "@/components/external-participant-chips";
import { Reveal } from "@/components/reveal";

type ParticipantWithUser = PeriodParticipant & { user: User };
type PeriodWithParticipants = CollaborativePeriod & {
  participants: ParticipantWithUser[];
  externalParticipants: ExternalParticipant[];
};

// Lecture seule pour le tableau de bord direction/référent — volontairement
// distinct de PeriodCard, qui porte des actions de confirmation propres à
// l'enseignant connecté (non pertinentes sur un écran de supervision).
export function SchoolPeriodList({ periods }: { periods: PeriodWithParticipants[] }) {
  if (periods.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Aucune période déclarée pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {periods.map((period, index) => {
        const status = computePeriodStatus(period.participants);
        return (
          <Reveal
            key={period.id}
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
                  {p.isInitiator && " · initiateur·rice"} — {participantStatusLabel[p.status]}
                </li>
              ))}
            </ul>

            <ExternalParticipantChips participants={period.externalParticipants} />
          </Reveal>
        );
      })}
    </div>
  );
}
