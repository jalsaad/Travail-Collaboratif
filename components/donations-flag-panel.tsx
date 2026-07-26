"use client";

import { useActionState } from "react";
import { toggleDonationsFlag, type DonationsFlagState } from "@/app/admin/dons/actions";

const initialState: DonationsFlagState = {};

export function DonationsFlagPanel({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: DonationsFlagState) => toggleDonationsFlag(),
    initialState
  );

  return (
    <form action={formAction} className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">Service dons</h2>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Modélisé (Donation, FeatureFlag) mais aucune interface de collecte n&apos;existe encore
            — ce flag active/désactive uniquement l&apos;interrupteur pour une fonctionnalité à
            construire plus tard.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            enabled
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
          }`}
        >
          {enabled ? "Activé" : "Désactivé"}
        </span>
      </div>
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}
      <button type="submit" disabled={pending} className="btn-secondary mt-4">
        {pending ? "..." : enabled ? "Désactiver" : "Activer"}
      </button>
    </form>
  );
}
