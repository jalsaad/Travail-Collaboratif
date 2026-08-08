"use client";

import { useActionState, useState } from "react";
import {
  deleteAccountAsAdmin,
  type AccountActionState,
} from "@/app/admin/utilisateurs/actions";

const initialState: AccountActionState = {};

export function AdminDeleteAccount({
  userId,
  email,
  returnTo,
}: {
  userId: string;
  email: string;
  returnTo: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteAccountAsAdmin.bind(null, userId, returnTo),
    initialState
  );
  const [confirmation, setConfirmation] = useState("");

  const ready = confirmation.trim().toLowerCase() === email.toLowerCase();

  if (state.success) {
    return (
      <div className="card border-emerald-300 p-6 dark:border-emerald-800">
        <p className="text-sm text-emerald-800 dark:text-emerald-300">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 border-red-300 p-6 dark:border-red-900">
      <div>
        <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">
          Supprimer ce compte
        </h2>
        <p className="mt-1.5 text-xs text-stone-600 dark:text-stone-400">
          Si ce compte n&apos;a laissé aucune trace collaborative, sa ligne est{" "}
          <strong>entièrement supprimée</strong> de la base : une réinscription repartira d&apos;une
          fiche neuve, sans doublon. Sinon, les données personnelles sont effacées — email, nom,
          prénom, matricule, date de naissance, mot de passe — et les rattachements passent en
          retiré. Dans les deux cas,{" "}
          <strong>l&apos;adresse {email} redevient disponible</strong>.
        </p>
        <p className="mt-1.5 text-xs text-stone-600 dark:text-stone-400">
          Les périodes déclarées ou validées par cette personne sont toujours conservées : elles
          constituent le relevé annuel de ses collègues. Son nom y est remplacé par « Compte
          supprimé ». L&apos;opération est irréversible.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmation"
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Pour confirmer, recopiez l&apos;adresse du compte : {email}
        </label>
        <input
          id="confirmation"
          name="confirmation"
          autoComplete="off"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="input-field mt-1.5"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !ready}
        className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Suppression..." : "Supprimer définitivement ce compte"}
      </button>
    </form>
  );
}
