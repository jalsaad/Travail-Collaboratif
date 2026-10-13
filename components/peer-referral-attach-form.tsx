"use client";

import { useActionState } from "react";
import {
  attachParticipationFromReferral,
  type ReferralAttachState,
} from "@/app/(auth)/rejoindre/parrainage/[token]/actions";

const initialState: ReferralAttachState = {};

/// Un seul bouton, pour la personne déjà connectée : elle n'a pas de compte à
/// créer, seulement une participation à valider.
///
/// `dejaMembre` à false quand le parrainage porte sur une école où elle n'est
/// pas (encore) rattachée : le bouton l'y fait entrer du même geste, sans
/// réclamer niveaux ni heures — à compléter dans Mon profil, ce que le
/// libellé annonce.
export function PeerReferralAttachForm({
  token,
  dejaMembre,
  avecPeriode,
}: {
  token: string;
  dejaMembre: boolean;
  avecPeriode: boolean;
}) {
  const [state, formAction, pending] = useActionState(attachParticipationFromReferral, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />

      {!dejaMembre && (
        <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-900 dark:bg-stone-800 dark:text-brand-200">
          Vous rejoindrez cette école du même geste. Pensez ensuite à renseigner vos niveaux et vos
          heures dans <span className="font-semibold">Mon profil</span> : c&apos;est ce qui ajuste votre
          objectif annuel.
        </p>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending
          ? "Validation..."
          : avecPeriode
            ? "Valider ma participation"
            : "Rejoindre l'école"}
      </button>
    </form>
  );
}
