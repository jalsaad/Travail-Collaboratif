"use client";

import { useActionState, useState } from "react";
import {
  deleteAccountAsAdmin,
  type AccountActionState,
} from "@/app/admin/utilisateurs/actions";

const initialState: AccountActionState = {};

export type OrphanAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAtLabel: string;
};

// Une ligne = un formulaire indépendant : chaque suppression a son propre état
// et sa propre confirmation, sans quoi un message d'erreur s'afficherait sur
// toutes les lignes à la fois.
function OrphanRow({ account }: { account: OrphanAccount }) {
  const [state, formAction, pending] = useActionState(
    deleteAccountAsAdmin.bind(null, account.id, "/admin/utilisateurs"),
    initialState
  );
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const ready = confirmation.trim().toLowerCase() === account.email.toLowerCase();

  if (state.success) {
    return (
      <tr className="border-b border-stone-50 last:border-0 dark:border-stone-800">
        <td colSpan={3} className="px-5 py-3.5 text-sm text-emerald-700 dark:text-emerald-400">
          {state.success}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-stone-50 last:border-0 align-top dark:border-stone-800">
      <td className="px-5 py-3.5">
        <p className="text-sm text-stone-900 dark:text-stone-100">
          {account.firstName} {account.lastName}
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">{account.email}</p>
      </td>
      <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
        {account.createdAtLabel}
      </td>
      <td className="px-5 py-3.5 text-right">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Supprimer
          </button>
        ) : (
          <form action={formAction} className="space-y-2">
            <input
              name="confirmation"
              autoComplete="off"
              placeholder={account.email}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="input-field text-xs"
            />
            <p className="text-left text-xs text-stone-500 dark:text-stone-400">
              Recopiez l&apos;adresse pour confirmer. Opération irréversible.
            </p>
            {state.error && <p className="text-left text-xs text-red-600">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-xs text-stone-500 hover:underline"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending || !ready}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </form>
        )}
      </td>
    </tr>
  );
}

/// Comptes sans aucun rattachement actif : école supprimée, ou membre retiré
/// de partout. Sans cet écran ils seraient inatteignables — la suppression de
/// compte vit dans la fiche membre, qui n'existe plus pour eux — et leur
/// adresse resterait bloquée à vie.
export function AdminOrphanAccounts({ accounts }: { accounts: OrphanAccount[] }) {
  if (accounts.length === 0) {
    return (
      <p className="card p-5 text-sm text-stone-500 dark:text-stone-400">
        Aucun compte sans rattachement.
      </p>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
            <th className="px-5 py-3">Compte</th>
            <th className="px-5 py-3">Créé le</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <OrphanRow key={a.id} account={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
