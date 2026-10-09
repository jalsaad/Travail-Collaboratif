"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ActiveMembership } from "@/lib/active-school";
import { switchSchool } from "@/app/(app)/actions";
import { useMenuDismiss } from "@/components/use-menu-dismiss";
import { LeaveSchoolDialog } from "@/components/leave-school-dialog";

/// Contrôle d'école, posé en permanence dans la barre du haut — à droite du
/// bouton de menu.
///
/// Il remplace le `<select>` enterré au pied du tiroir : celui-ci n'était
/// atteignable qu'une fois le tiroir ouvert, et le tiroir est fermé par
/// défaut. Trois gestes y sont réunis parce qu'ils répondent à la même
/// question — « dans quelle école suis-je ? » : changer d'école, en rejoindre
/// une autre, quitter celle-ci.
///
/// Il affiche aussi en permanence l'école active. Jusqu'ici, seul le titre de
/// la page le disait, et il disparaissait au défilement.
export function SchoolMenu({
  active,
  memberships,
}: {
  active: ActiveMembership;
  memberships: ActiveMembership[];
}) {
  const [open, setOpen] = useState(false);
  // Monté en FRÈRE du menu déroulant, et non dedans : refermer le menu en
  // ouvrant la confirmation démonterait la boîte de dialogue avec lui.
  const [confirmer, setConfirmer] = useState(false);
  const [pending, startTransition] = useTransition();
  const conteneur = useRef<HTMLDivElement>(null);
  const fermer = useCallback(() => setOpen(false), []);
  useMenuDismiss(conteneur, open, fermer);

  const autres = memberships.filter((m) => m.schoolId !== active.schoolId);

  return (
    <>
      <div ref={conteneur} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          disabled={pending}
          className="flex h-10 max-w-[min(17rem,calc(100vw-13rem))] items-center gap-2 rounded-lg border border-stone-300 bg-white/90 px-3 text-sm font-semibold text-stone-800 shadow-sm backdrop-blur transition hover:border-brand-500 hover:bg-white disabled:opacity-60 dark:border-stone-600 dark:bg-stone-900/90 dark:text-stone-100 dark:hover:border-brand-400 dark:hover:bg-stone-900"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5" />
          </svg>
          <span className="truncate">{active.schoolName}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
          >
            {autres.length > 0 && (
              <>
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Mes écoles
                </p>
                <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-2 text-sm font-semibold text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">{active.schoolName}</span>
                </p>
                {autres.map((m) => (
                  <button
                    key={m.schoolId}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      startTransition(() => {
                        switchSchool(m.schoolId);
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-stone-600 transition hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                  >
                    <span className="h-4 w-4 shrink-0" />
                    <span className="truncate">{m.schoolName}</span>
                  </button>
                ))}
                <div className="my-1.5 border-t border-stone-200 dark:border-stone-700" />
              </>
            )}

            <Link
              href="/rejoindre-ecole"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-brand-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              Rejoindre une autre école
            </Link>

            {/* Le ou la titulaire du compte ne peut pas partir : l'école
                resterait sans personne pour l'administrer. Le bouton reste
                VISIBLE mais désactivé, avec le motif — le masquer laisserait
                chercher une fonction qu'on lui a dit exister. */}
            {active.isAccountOwner ? (
              <p className="px-2.5 py-2 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
                Vous avez créé cette école : la quitter la laisserait sans administrateur.
              </p>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmer(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  className="h-4 w-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"
                  />
                </svg>
                Quitter cette école
              </button>
            )}
          </div>
        )}
      </div>

      {confirmer && (
        <LeaveSchoolDialog
          schoolId={active.schoolId}
          schoolName={active.schoolName}
          onClose={() => setConfirmer(false)}
        />
      )}
    </>
  );
}
