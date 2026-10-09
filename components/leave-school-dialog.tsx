"use client";

import { useActionState, useEffect } from "react";
import { leaveSchool, type LeaveSchoolState } from "@/app/(app)/actions";

const initialState: LeaveSchoolState = {};

/// Confirmation d'un départ volontaire.
///
/// Le texte insiste sur les deux points qui inquiètent réellement : ce que
/// deviennent les périodes déjà déclarées (elles restent), et la possibilité
/// de revenir (elle existe, par le code de rattachement). Sans ces deux
/// phrases, le bouton rouge se lit comme une suppression de compte.
export function LeaveSchoolDialog({
  schoolId,
  schoolName,
  onClose,
}: {
  schoolId: string;
  schoolName: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(leaveSchool, initialState);

  // Le départ enregistré, la mise en page est revalidée côté serveur et
  // l'école disparaît des menus : il ne reste qu'à refermer.
  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  useEffect(() => {
    function surClavier(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", surClavier);
    return () => document.removeEventListener("keydown", surClavier);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-quitter-ecole"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900"
      >
        <span className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"
            />
          </svg>
        </span>

        <h2
          id="titre-quitter-ecole"
          className="text-lg font-bold leading-snug text-stone-900 dark:text-stone-100"
        >
          Quitter {schoolName} ?
        </h2>

        <p className="mt-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Vous ne pourrez plus y déclarer de période, ni consulter celles qui s'y trouvent.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            Vos périodes déjà déclarées y restent.
          </strong>{" "}
          L'école en a besoin pour sa justification annuelle, et des collègues vous ont peut-être
          nommée dans les leurs.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Si vous y êtes réaffectée un jour, il vous suffira du code de rattachement pour revenir :
          votre historique reviendra avec vous.
        </p>

        {state.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {state.error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Annuler
          </button>
          <form action={formAction}>
            <input type="hidden" name="schoolId" value={schoolId} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {pending ? "…" : "Quitter cette école"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
