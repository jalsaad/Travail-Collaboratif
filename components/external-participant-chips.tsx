import type { ExternalParticipant } from "@prisma/client";
import { externalParticipantStatusLabel } from "@/lib/external-participants";

// Présentées à part des intervenant·es enseignants, et sans statut de
// validation : ces personnes n'ont rien à confirmer. Le trait discontinu les
// distingue au premier coup d'œil des puces pleines qui, elles, comptent dans
// l'obligation annuelle.
export function ExternalParticipantChips({ participants }: { participants: ExternalParticipant[] }) {
  if (participants.length === 0) return null;

  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {participants.map((p) => (
        <li
          key={p.id}
          className="rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-xs text-stone-500 dark:border-stone-600 dark:text-stone-400"
        >
          {p.fullName} — {externalParticipantStatusLabel(p.status)}
        </li>
      ))}
    </ul>
  );
}
