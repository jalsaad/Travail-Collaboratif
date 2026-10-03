"use client";

import { useActionState } from "react";
import { marquerRefusContacte, type SuiviRefusState } from "@/app/admin/refus/actions";

const initialState: SuiviRefusState = {};

/// Suivi d'une tentative d'inscription échouée : une note, et un bouton qui
/// la marque traitée. Un formulaire par ligne, chacun avec son propre état —
/// sans quoi un message d'erreur s'afficherait sur toutes les lignes à la
/// fois (même parti pris que components/admin-orphan-accounts.tsx).
export function FormRejectionFollowUp({
  rejectionId,
  contacted,
  notes,
}: {
  rejectionId: string;
  contacted: boolean;
  notes: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    marquerRefusContacte.bind(null, rejectionId),
    initialState
  );

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        name="notes"
        defaultValue={notes ?? ""}
        placeholder={contacted ? "Note (vider pour rouvrir)" : "Note : rappelée, sans réponse…"}
        aria-label="Note de suivi"
        className="input-field h-9 min-w-0 flex-1 py-1.5 text-xs"
      />
      <button type="submit" disabled={pending} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
        {pending ? "…" : contacted ? "Mettre à jour" : "Marquer traitée"}
      </button>
      {state.error && <span className="w-full text-xs text-red-600">{state.error}</span>}
      {state.success && (
        <span className="w-full text-xs text-emerald-700 dark:text-emerald-400">{state.success}</span>
      )}
    </form>
  );
}
