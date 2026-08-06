"use client";

import { useActionState } from "react";
import Link from "next/link";
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

  if (state.done) {
    return (
      <div className="space-y-4 text-center">
        <p
          className={`rounded-lg px-3 py-2.5 text-sm ${
            state.done === "CONFIRMED"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          }`}
        >
          {state.done === "CONFIRMED"
            ? "Votre participation est confirmée. Merci !"
            : "Votre participation a été déclinée. L'initiateur·rice en sera informé·e."}
        </p>
        <Link href="/login" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-500">
          Accéder à la plateforme
        </Link>
      </div>
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
