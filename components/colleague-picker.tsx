"use client";

import { useMemo, useState } from "react";

type Colleague = { membershipId: string; name: string };

/// Insensible à la casse ET aux accents : « Benali » doit sortir sur « benali »
/// comme « Vermeulen » sur « vermeülen ». Même normalisation que la recherche de
/// membres de l'espace direction (cf. components/school-team-table.tsx).
function normalise(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Les intervenant·es se choisissaient dans une pile de listes déroulantes :
// praticable à cinq collègues, inutilisable dans une école qui en compte
// quatre-vingts. Un champ de recherche filtre l'équipe, chaque nom retenu
// devient une puce, et les identifiants partent en champs cachés — le contrat
// avec l'action serveur (colleagueMembershipIds) ne change pas.
//
// La liste reçue est déjà celle de l'école active seule : un enseignant
// rattaché à plusieurs écoles voit les collègues de celle qu'il a sélectionnée
// dans le tiroir, jamais un mélange des deux (cf. app/(app)/declarer/page.tsx,
// qui interroge resolveActiveMembership).
export function ColleaguePicker({
  colleagues,
  initialSelected = [],
}: {
  colleagues: Colleague[];
  initialSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [recherche, setRecherche] = useState("");

  const parId = useMemo(
    () => new Map(colleagues.map((c) => [c.membershipId, c])),
    [colleagues]
  );

  const resultats = useMemo(() => {
    const terme = normalise(recherche.trim());
    return colleagues.filter(
      (c) => !selected.includes(c.membershipId) && (terme === "" || normalise(c.name).includes(terme))
    );
  }, [colleagues, selected, recherche]);

  if (colleagues.length === 0) {
    return <p className="text-xs text-stone-500 dark:text-stone-400">Aucun·e autre collègue dans cette école.</p>;
  }

  const ajouter = (membershipId: string) => {
    setSelected((prev) => [...prev, membershipId]);
    setRecherche("");
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <li
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm text-brand-800 ring-1 ring-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-900"
            >
              {/* Le nom vient de la liste, pas de la puce : un identifiant
                  sélectionné puis absent de la liste (collègue désactivé entre
                  deux chargements) reste retirable au lieu d'afficher un vide. */}
              {parId.get(id)?.name ?? "Collègue introuvable"}
              <input type="hidden" name="colleagueMembershipIds" value={id} />
              <button
                type="button"
                onClick={() => setSelected((prev) => prev.filter((x) => x !== id))}
                aria-label={`Retirer ${parId.get(id)?.name ?? "cet·te intervenant·e"}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-brand-500 transition hover:bg-brand-100 hover:text-brand-800 dark:hover:bg-brand-900 dark:hover:text-brand-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3 w-3">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length < colleagues.length && (
        <>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un·e collègue…"
            aria-label="Rechercher un·e collègue"
            className="input-field"
          />
          {/* Repliée tant qu'on n'a rien tapé et que l'équipe est nombreuse :
              dérouler quatre-vingts noms sous le champ n'aide personne. */}
          {(recherche.trim() !== "" || colleagues.length <= 8) && (
            <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-700">
              {resultats.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-stone-500 dark:text-stone-400">
                  Aucun·e collègue ne correspond à « {recherche.trim()} ».
                </p>
              ) : (
                <ul>
                  {resultats.map((c) => (
                    <li key={c.membershipId}>
                      <button
                        type="button"
                        onClick={() => ajouter(c.membershipId)}
                        className="block w-full px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-brand-50 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
