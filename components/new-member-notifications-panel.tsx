"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setNewMemberNotifications, type SchoolActionState } from "@/app/(app)/ecole/parametres/actions";

/// Interrupteur personnel : recevoir ou non un email à chaque nouvelle
/// inscription dans l'école active. Bascule immédiatement à l'écran, puis
/// revient en arrière si l'enregistrement est refusé (démonstration, droits
/// retirés entre-temps) — l'affichage ne ment jamais durablement sur l'état
/// réel.
export function NewMemberNotificationsPanel({ enabled }: { enabled: boolean }) {
  const [actif, setActif] = useState(enabled);
  const [state, setState] = useState<SchoolActionState>({});
  const [pending, startTransition] = useTransition();

  function basculer() {
    const voulu = !actif;
    setActif(voulu);
    setState({});
    startTransition(async () => {
      const resultat = await setNewMemberNotifications(voulu);
      if (resultat.error) setActif(!voulu);
      setState(resultat);
    });
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">Mes notifications</h2>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p id="notif-inscriptions" className="text-sm text-stone-900 dark:text-stone-100">
            Recevoir un email à chaque nouvelle inscription
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Ce réglage ne concerne que vous : les autres membres de la direction gardent le leur.
            Les nouvelles inscriptions restent toujours visibles dans{" "}
            <Link href="/ecole/membres" className="text-brand-700 hover:underline dark:text-brand-400">
              Membres
            </Link>{" "}
            et dans le{" "}
            <Link href="/ecole/audit" className="text-brand-700 hover:underline dark:text-brand-400">
              journal
            </Link>
            .
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={actif}
          aria-labelledby="notif-inscriptions"
          disabled={pending}
          onClick={basculer}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60 ${
            actif ? "bg-gradient-to-r from-brand-600 to-brand-teal" : "bg-stone-300 dark:bg-stone-700"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              actif ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}
    </div>
  );
}
