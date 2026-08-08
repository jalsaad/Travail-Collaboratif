"use client";

import { useActionState } from "react";
import { regenerateJoinCode, type SchoolActionState } from "@/app/(app)/ecole/parametres/actions";
import { JoinPosterLink } from "@/components/join-poster-link";

const initialState: SchoolActionState = {};

export function JoinCodePanel({ code }: { code: string | null }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: SchoolActionState) => regenerateJoinCode(),
    initialState
  );

  return (
    <form action={formAction} className="card p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">Code de rattachement</h2>
      <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 font-mono text-lg tracking-wide text-stone-900 dark:bg-stone-800 dark:text-stone-100">
        {code ?? "Aucun code actif"}
      </p>
      <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
        Régénérer désactive l&apos;ancien code (conservé pour traçabilité) et en crée un nouveau.
      </p>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-secondary mt-3.5">
          {pending ? "Génération..." : "Régénérer"}
        </button>
        {code && <JoinPosterLink />}
      </div>
      {code && (
        <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
          Affiche A4 à placarder en salle des profs : le QR code ouvre le formulaire
          d&apos;inscription avec ce code déjà rempli.
        </p>
      )}
    </form>
  );
}
