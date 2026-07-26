"use client";

import { useActionState, useState, useTransition } from "react";
import {
  publishTeacherReminder,
  cancelTeacherReminder,
  type ReminderActionState,
} from "@/app/(app)/ecole/actions";

const initialState: ReminderActionState = {};
const DEFAULT_DAYS = 5;

function suggestedMessage(days: number) {
  return `Il vous reste ${days} jour${days > 1 ? "s" : ""} pour la remise des tableaux de votre travail collaboratif.`;
}

export function TeacherReminderPanel({
  activeReminder,
}: {
  activeReminder: { id: string; body: string; daysRemaining: number } | null;
}) {
  const [state, formAction, pending] = useActionState(publishTeacherReminder, initialState);
  const [cancelPending, startCancelTransition] = useTransition();
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [message, setMessage] = useState(suggestedMessage(DEFAULT_DAYS));
  const [messageTouched, setMessageTouched] = useState(false);

  if (activeReminder) {
    return (
      <div className="card space-y-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Rappel actif auprès des enseignant·es</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{activeReminder.body}</p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
            {activeReminder.daysRemaining <= 0
              ? "Expire aujourd'hui"
              : `Expire dans ${activeReminder.daysRemaining} jour${activeReminder.daysRemaining > 1 ? "s" : ""}`}
          </span>
        </div>
        <button
          type="button"
          disabled={cancelPending}
          onClick={() => startCancelTransition(() => cancelTeacherReminder(activeReminder.id))}
          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {cancelPending ? "..." : "Annuler ce rappel"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-3 p-6">
      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Rappel de remise — travail collaboratif</p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Publie une annonce éphémère, visible uniquement par les enseignant·es de votre école, pour
          rappeler la remise des tableaux en fin de période trimestrielle.
        </p>
      </div>

      <div>
        <label htmlFor="days" className="block text-xs font-medium text-stone-700 dark:text-stone-300">
          Durée du rappel (en jours)
        </label>
        <input
          id="days"
          name="days"
          type="number"
          min={1}
          max={30}
          required
          value={days}
          onChange={(e) => {
            const next = Number(e.target.value) || 1;
            setDays(next);
            if (!messageTouched) setMessage(suggestedMessage(next));
          }}
          className="input-field mt-1 w-24"
        />
      </div>

      <textarea
        name="message"
        required
        rows={2}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setMessageTouched(true);
        }}
        className="input-field"
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Publication..." : `Publier le rappel (${days} jour${days > 1 ? "s" : ""})`}
      </button>
    </form>
  );
}
