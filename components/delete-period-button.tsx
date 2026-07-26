"use client";

import { useState, useTransition } from "react";
import { deletePeriod } from "@/app/(app)/mes-periodes/actions";

export function DeletePeriodButton({ periodId }: { periodId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Supprimer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-700 dark:text-red-400">Confirmer la suppression ?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deletePeriod(periodId))}
        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "..." : "Oui, supprimer"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        Annuler
      </button>
    </div>
  );
}
