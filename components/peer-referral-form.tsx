"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createPeerReferral, type CreatePeerReferralState } from "@/app/(app)/inviter/actions";

const initialState: CreatePeerReferralState = {};

export function PeerReferralForm({ periods }: { periods: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createPeerReferral, initialState);
  const [copied, setCopied] = useState(false);

  const copier = async () => {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card space-y-4 p-6">
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="periodId" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Lier à une période précise <span className="font-normal text-stone-400">(facultatif)</span>
          </label>
          <select id="periodId" name="periodId" defaultValue="" className="input-field mt-1.5">
            <option value="">Aucune — juste rejoindre l&apos;école</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            En choisissant une période, la personne invitée valide automatiquement sa participation à
            celle-ci en créant son compte.
          </p>
        </div>

        <div>
          <label htmlFor="invitedName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Nom du·de la collègue <span className="font-normal text-stone-400">(facultatif, pour vous y retrouver)</span>
          </label>
          <input
            id="invitedName"
            name="invitedName"
            maxLength={80}
            placeholder="ex: Sophie D."
            className="input-field mt-1.5"
          />
        </div>

        <div>
          <label htmlFor="inviteeEmail" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Email du·de la collègue <span className="font-normal text-stone-400">(facultatif)</span>
          </label>
          <input
            id="inviteeEmail"
            name="inviteeEmail"
            type="email"
            placeholder="ex: sophie.d@ecole.be"
            className="input-field mt-1.5"
          />
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Renseigné, l&apos;invitation part directement par email. Laissé vide, vous transmettez
            vous-même le lien ou le QR ci-dessous (en main propre, par messagerie...).
          </p>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Génération..." : "Générer le lien de parrainage"}
        </button>
      </form>

      {state.link && state.qrDataUrl && (
        <div className="flex flex-col items-center gap-3 border-t border-stone-100 pt-4 text-center dark:border-stone-800">
          {state.emailSentTo ? (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Invitation envoyée à {state.emailSentTo}. Vous pouvez aussi transmettre ce lien vous-même.
            </p>
          ) : (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Copiez ce lien maintenant : il ne sera plus jamais réaffiché.
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qrDataUrl} alt="QR code du lien de parrainage" className="h-40 w-40" />
          <div className="flex w-full items-center gap-2">
            <input
              readOnly
              value={state.link}
              onFocus={(e) => e.currentTarget.select()}
              className="input-field flex-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={copier}
              className="shrink-0 rounded-lg border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900"
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
