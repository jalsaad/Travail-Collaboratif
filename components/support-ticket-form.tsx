"use client";

import { useActionState, useState } from "react";
import { createSupportTicket, type SupportTicketState } from "@/app/(app)/assistance/actions";
import { SUPPORT_ATTACHMENT_ACCEPT, SUPPORT_ATTACHMENT_HINT } from "@/lib/support-attachment-formats";

const initialState: SupportTicketState = {};

export function SupportTicketForm() {
  const [state, formAction, pending] = useActionState(createSupportTicket, initialState);
  // Le contrôle natif n'annonce le fichier choisi que dans un libellé minuscule
  // et non traduit ; on le réaffiche en clair, avec de quoi se raviser.
  const [fichier, setFichier] = useState<File | null>(null);

  if (state?.success) {
    return (
      <div className="card p-6">
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Type de demande
        </label>
        <select id="category" name="category" required defaultValue="ASSISTANCE" className="input-field mt-1.5">
          <option value="ASSISTANCE">Demande d&apos;assistance</option>
          <option value="INCIDENT">Signaler un incident</option>
        </select>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Sujet
        </label>
        <input id="subject" name="subject" required className="input-field mt-1.5" />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Message
        </label>
        <textarea id="message" name="message" required rows={6} className="input-field mt-1.5" />
      </div>

      <div>
        <label htmlFor="attachment" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Ajouter un fichier, capture d&apos;écran… <span className="font-normal text-stone-400">(facultatif)</span>
        </label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept={SUPPORT_ATTACHMENT_ACCEPT}
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full cursor-pointer rounded-lg border border-stone-200 bg-white text-sm text-stone-500 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-stone-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:file:bg-stone-800 dark:file:text-stone-200 dark:hover:file:bg-stone-700"
        />
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          {fichier ? `${fichier.name} — ${(fichier.size / 1024).toFixed(0)} Ko` : SUPPORT_ATTACHMENT_HINT}
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
