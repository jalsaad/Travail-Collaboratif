"use client";

import { useState } from "react";

// Le tableau n'affiche que le sujet par défaut (pas d'extrait du message) —
// cliquer dessus déplie le corps du message juste en dessous, dans la même
// cellule, sans changer la structure du tableau.
export function SupportTicketSubject({ subject, message }: { subject: string; message: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-left font-medium text-stone-900 underline decoration-dotted underline-offset-2 transition hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-500"
      >
        {subject}
      </button>
      {open && (
        <p className="mt-1.5 max-w-md whitespace-pre-wrap text-xs text-stone-500 dark:text-stone-400">
          {message}
        </p>
      )}
    </div>
  );
}
