"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchJoinableSchools, type JoinableSchool } from "@/app/(auth)/rejoindre/actions";

// Alternative au code de rattachement tapé à l'aveugle : recherche par nom
// parmi les écoles déjà inscrites (cf. searchJoinableSchools). Même mécanique
// que components/school-name-search.tsx (pas de bibliothèque de type
// combobox dans ce projet), mais sur une source de données différente —
// School plutôt que l'annuaire FwbSchool.
export function JoinableSchoolSearch({
  onSelect,
  selected,
}: {
  onSelect: (school: JoinableSchool | null) => void;
  selected: JoinableSchool | null;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [suggestions, setSuggestions] = useState<JoinableSchool[]>([]);
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
        const resultats = await searchJoinableSchools(query);
        setSuggestions(resultats);
        setOpen(true);
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const choisir = (school: JoinableSchool) => {
    setQuery(school.name);
    setOpen(false);
    onSelect(school);
  };

  return (
    <div className="relative">
      <label htmlFor="joinableSchoolSearch" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        École
      </label>
      <input
        id="joinableSchoolSearch"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected) onSelect(null); // une nouvelle frappe invalide le choix précédent
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ex: Athénée royal de..."
        autoComplete="off"
        className="input-field mt-1.5"
      />
      {selected && (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">École sélectionnée : {selected.name}</p>
      )}
      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {pending ? (
            <p className="px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400">Recherche…</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400">
              Aucune école correspondante n&apos;est inscrite avec un code actif.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((school) => (
                <li key={school.id}>
                  <button
                    type="button"
                    onMouseDown={() => choisir(school)}
                    className="block w-full px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-brand-50 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <span className="font-medium">{school.name}</span>
                    {school.locality && (
                      <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-500">{school.locality}</span>
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
