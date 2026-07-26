"use client";

import { useTransition } from "react";
import { confirmParticipation, declineParticipation } from "@/app/(app)/mes-periodes/actions";

export function ParticipationActions({ periodId }: { periodId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => confirmParticipation(periodId))}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        Confirmer ma participation
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => declineParticipation(periodId))}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        Refuser
      </button>
    </div>
  );
}
