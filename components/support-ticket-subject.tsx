"use client";

import { useState } from "react";

// Le tableau n'affiche que le sujet par défaut (pas d'extrait du message) —
// cliquer dessus déplie le corps du message juste en dessous, dans la même
// cellule, sans changer la structure du tableau.
export function SupportTicketSubject({
  subject,
  message,
  attachment,
}: {
  subject: string;
  message: string;
  /// Pièce jointe du ticket, le cas échéant (cf. lib/support-attachment.ts).
  attachment?: { url: string; name: string } | null;
}) {
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
        <>
          <p className="mt-1.5 max-w-md whitespace-pre-wrap text-xs text-stone-500 dark:text-stone-400">
            {message}
          </p>
          {attachment && (
            // Nouvel onglet : une capture ou un PDF s'examine à côté du
            // tableau, sans perdre la liste des tickets ouverts.
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.4 12.6l-7.1 7.1a4 4 0 01-5.7-5.7l7.8-7.8a2.5 2.5 0 013.5 3.5l-7.8 7.8a1 1 0 01-1.4-1.4l7.1-7.1"
                />
              </svg>
              {attachment.name}
            </a>
          )}
        </>
      )}
    </div>
  );
}
