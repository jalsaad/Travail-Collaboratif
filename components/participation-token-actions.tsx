"use client";

import { useActionState } from "react";
import {
  confirmByToken,
  declineByToken,
  type TokenActionState,
} from "@/app/(auth)/valider/[token]/actions";

const initialState: TokenActionState = {};

export function ParticipationTokenActions({ token }: { token: string }) {
  const [confirmState, confirm, confirming] = useActionState(
    confirmByToken.bind(null, token),
    initialState
  );
  const [declineState, decline, declining] = useActionState(
    declineByToken.bind(null, token),
    initialState
  );

  const state = confirmState.done || confirmState.error ? confirmState : declineState;
  const pending = confirming || declining;

  // Pas de lien « Accéder à la plateforme » ici : la page en affiche déjà un
  // en pied, quel que soit l'état, et l'ajouter ferait doublon.
  if (state.done) {
    return (
      <p
        className={`rounded-lg px-3 py-2.5 text-center text-sm ${
          state.done === "CONFIRMED"
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
        }`}
      >
        {state.done === "CONFIRMED"
          ? "Votre participation est confirmée. Merci !"
          : "Votre participation a été déclinée. L'initiateur·rice en sera informé·e."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <form action={confirm}>
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {confirming ? "Validation..." : "Valider ma participation"}
        </button>
      </form>

      <form action={decline}>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          {declining ? "Envoi..." : "Je n'ai pas participé"}
        </button>
      </form>
    </div>
  );
}
