"use client";

import { useEffect, type RefObject } from "react";

/// Ferme un menu déroulant sur Échap et sur un clic en dehors de lui.
///
/// `pointerdown` plutôt que `click` : un `click` ne se déclenche qu'au
/// relâchement, si bien qu'un glisser commencé dans le menu et relâché hors
/// de lui le refermait alors que l'intention était inverse. Et les écouteurs
/// ne sont posés QUE pendant l'ouverture — un menu fermé n'a aucune raison
/// d'écouter le clavier de toute la page.
export function useMenuDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!open) return;

    function surPointeur(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    function surClavier(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", surPointeur);
    document.addEventListener("keydown", surClavier);
    return () => {
      document.removeEventListener("pointerdown", surPointeur);
      document.removeEventListener("keydown", surClavier);
    };
  }, [ref, open, close]);
}
