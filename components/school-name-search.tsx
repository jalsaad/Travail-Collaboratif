"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchFwbSchoolsByName,
  type FwbSchoolSuggestion,
} from "@/app/(auth)/creer-ecole/actions";

// Recherche par nom plutôt que par numéro FASE, que les enseignants ne
// connaissent généralement pas par cœur — cf. le commentaire de
// searchFwbSchoolsByName. Pas de bibliothèque de type "combobox" dans ce
// projet (cf. exploration de la cartographie, purement server-rendered) :
// champ contrôlé + délai de saisie manuel + liste déroulante minimale.
export function SchoolNameSearch({ onSelect }: { onSelect: (numeroFase: string) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FwbSchoolSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const resultats = await searchFwbSchoolsByName(query);
        setSuggestions(resultats);
        setOpen(true);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const choisir = (ecole: FwbSchoolSuggestion) => {
    setQuery(ecole.name);
    setOpen(false);
    onSelect(ecole.numeroFase);
  };

  return (
    <div className="relative">
      <label htmlFor="schoolNameSearch" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        Nom de l&apos;école
      </label>
      <input
        id="schoolNameSearch"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ex: Athénée royal de..."
        autoComplete="off"
        className="input-field mt-1.5"
      />
      {open && (query.trim().length >= 2) && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {pending ? (
            <p className="px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400">Recherche…</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400">
              Aucune école trouvée. Vous pourrez compléter le formulaire à la main ci-dessous.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((ecole) => (
                <li key={ecole.numeroFase}>
                  <button
                    type="button"
                    // onMouseDown plutôt que onClick : se déclenche avant le
                    // onBlur du champ, qui fermerait sinon la liste avant que
                    // le clic n'atteigne ce bouton.
                    onMouseDown={() => choisir(ecole)}
                    className="block w-full px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-brand-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <span className="font-medium">{ecole.name}</span>
                    {(ecole.locality || ecole.postalCode) && (
                      <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-500">
                        {[ecole.postalCode, ecole.locality].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
