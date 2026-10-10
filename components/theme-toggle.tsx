"use client";

import { useEffect, useState } from "react";

/// État du thème et bascule, partagés par les DEUX présentations : le bouton
/// flottant des espaces sans menu de compte, et la ligne de menu de l'espace
/// enseignant.
///
/// L'état initial « false » (clair) n'a besoin d'être correct qu'au tout
/// premier rendu serveur, où `document` n'existe pas : le script anti-flash
/// de app/layout.tsx a déjà posé la classe `.dark` sur <html> avant
/// l'hydratation, on se contente de la relire une fois monté.
export function useThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Stockage indisponible (navigation privée...) : le choix ne survivra
      // pas à un rechargement, mais bascule quand même la page en cours.
    }
  }

  return { isDark, toggle };
}

function IconeLune({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function IconeSoleil({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="4.5" />
      <path
        strokeLinecap="round"
        strokeWidth={2}
        stroke="currentColor"
        d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7 5.6 5.6"
      />
    </svg>
  );
}

/// Bouton flottant, dans le coin supérieur droit.
///
/// Monté UNIQUEMENT là où il n'y a pas de menu de compte : les pages
/// publiques (cf. app/(auth)/layout.tsx) et l'espace plateforme (cf.
/// app/admin/layout.tsx). Dans l'espace enseignant, la bascule a rejoint le
/// menu de la pastille de compte — voir ThemeMenuItem.
///
/// Il n'est donc plus monté par le layout racine : chaque espace déclare
/// lui-même son habillage, plutôt qu'un bouton global qu'il aurait fallu
/// masquer à partir d'une liste de chemins.
export function ThemeToggle() {
  const { isDark, toggle } = useThemeToggle();

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="fixed right-4 top-4 z-50 flex h-9 w-16 shrink-0 items-center rounded-full border border-stone-300 bg-stone-100 p-1 shadow-lg transition dark:border-stone-600 dark:bg-stone-800"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-brand-teal text-white shadow transition-transform duration-300 ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? <IconeLune className="h-4 w-4" /> : <IconeSoleil className="h-4 w-4" />}
      </span>
    </button>
  );
}

/// Ligne de menu, pour l'intérieur du menu de compte (cf.
/// components/account-menu.tsx).
///
/// Libellé fixe — « Mode sombre » — plutôt qu'un intitulé qui changerait avec
/// l'état : un interrupteur nomme ce qu'il commande, pas ce qu'il va faire.
/// L'état se lit sur le petit rail à droite, et `aria-checked` le dit aux
/// lecteurs d'écran.
export function ThemeMenuItem({ onToggle }: { onToggle?: () => void }) {
  const { isDark, toggle } = useThemeToggle();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => {
        toggle();
        onToggle?.();
      }}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-brand-400"
    >
      <span className="flex items-center gap-2">
        {isDark ? (
          <IconeLune className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
        ) : (
          <IconeSoleil className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
        )}
        Mode sombre
      </span>
      <span
        aria-hidden="true"
        className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          isDark ? "bg-brand-600" : "bg-stone-300 dark:bg-stone-600"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            isDark ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
