"use client";

import { useActionState } from "react";
import { createSupportTicket, type SupportTicketState } from "@/app/(app)/assistance/actions";

const initialState: SupportTicketState = {};

export function SupportTicketForm() {
  const [state, formAction, pending] = useActionState(createSupportTicket, initialState);

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

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
