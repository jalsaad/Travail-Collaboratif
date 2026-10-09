"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/(app)/actions";
import { useMenuDismiss } from "@/components/use-menu-dismiss";

/// Pastille de compte, posée en permanence sous le bouton de thème.
///
/// « Mon profil » et « Déconnexion » vivaient au pied du tiroir, c'est-à-dire
/// derrière deux gestes et tout en bas de l'écran — là même où la barre des
/// tâches de Windows venait les recouvrir. Les remonter dans la barre règle
/// définitivement le problème.
///
/// Le nom et l'adresse affichés répondent en plus à une question courante sur
/// un poste partagé en salle des profs : « suis-je connectée avec le bon
/// compte ? »
export function AccountMenu({
  name,
  email,
  initial,
}: {
  name: string;
  email: string | null;
  initial: string;
}) {
  const [open, setOpen] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);
  const fermer = useCallback(() => setOpen(false), []);
  useMenuDismiss(conteneur, open, fermer);

  return (
    <div ref={conteneur} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Mon compte"
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-brand-600 to-brand-teal text-sm font-bold text-white shadow-lg transition hover:brightness-105 dark:border-stone-800"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{name}</p>
            {email && (
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">{email}</p>
            )}
          </div>
          <div className="mb-1 border-t border-stone-200 dark:border-stone-700" />

          <Link
            href="/mon-profil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-brand-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0"
              />
            </svg>
            Mon profil
          </Link>

          <div className="my-1 border-t border-stone-200 dark:border-stone-700" />

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-4 w-4 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"
                />
              </svg>
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
