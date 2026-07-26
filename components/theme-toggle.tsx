"use client";

import { useEffect, useState } from "react";

// L'état initial "false" (clair) n'a besoin d'être correct qu'au tout premier
// rendu serveur (pas de `document` côté serveur) : le script anti-flash dans
// app/layout.tsx a déjà posé la classe `.dark` sur <html> avant l'hydratation
// si nécessaire, on se contente de la relire une fois monté côté client.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
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

  return (
    <button
      type="button"
      onClick={toggleTheme}
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
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <circle cx="12" cy="12" r="4.5" />
            <path
              strokeLinecap="round"
              strokeWidth={2}
              stroke="currentColor"
              d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7 5.6 5.6"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
