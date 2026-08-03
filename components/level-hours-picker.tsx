"use client";

import { useState } from "react";
import { TEACHING_LEVEL_OPTIONS } from "@/lib/teaching-levels";
import { groupByFamille } from "@/lib/disciplines";
import { AUTRE_DISCIPLINE_VALUE } from "@/lib/discipline-form";

let nextRowId = 0;

// Calculé une seule fois — référentiel statique (cf. lib/disciplines.ts),
// pas besoin d'une requête en base pour peupler ce sélecteur.
const DISCIPLINE_GROUPS = groupByFamille();

type DefaultRow = { level: string; hours: number; discipline: string; precision?: string };

// Lignes répétables niveau + heures/semaine + discipline, soumises comme
// tableaux parallèles (name="level"/"hours"/"discipline"/"disciplinePrecision")
// — même pattern que colleagueMembershipIds ailleurs dans ce projet, lu côté
// serveur via parseLevelHoursFromFormData (lib/teaching-levels.ts). La
// discipline est rattachée à CHAQUE ligne (juste sous son niveau) plutôt
// qu'être un champ unique pour toute la Membership : un même niveau peut
// être ajouté plusieurs fois si l'enseignant y donne plusieurs disciplines.
// La valeur soumise est le code officiel du référentiel FWB, jamais un
// texte libre — sauf "Autre (à préciser)", qui fait apparaître un champ de
// précision libre juste en dessous.
export function LevelHoursPicker({
  defaultValues,
  minRows = 1,
}: {
  defaultValues?: DefaultRow[];
  // 0 pour un rôle qui ne donne pas nécessairement cours (cf.
  // components/teaching-info-form.tsx) — 1 (par défaut) pour les parcours
  // d'inscription ENSEIGNANT, où au moins une déclaration est requise.
  minRows?: number;
}) {
  const initialRows: { level: string; hours?: number; discipline: string; precision: string }[] =
    defaultValues && defaultValues.length > 0
      ? defaultValues.map((r) => ({ ...r, precision: r.precision ?? "" }))
      : minRows > 0
        ? [{ level: "", hours: undefined, discipline: "", precision: "" }]
        : [];
  const [rows, setRows] = useState<
    { id: number; level: string; hours?: number; discipline: string; precision: string }[]
  >(() => initialRows.map((r) => ({ id: nextRowId++, ...r })));

  function addRow() {
    setRows((r) => [...r, { id: nextRowId++, level: "", hours: undefined, discipline: "", precision: "" }]);
  }

  function removeRow(id: number) {
    setRows((r) => (r.length > minRows ? r.filter((row) => row.id !== id) : r));
  }

  function setDiscipline(id: number, discipline: string) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, discipline } : row)));
  }

  return (
    <div>
      <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        Niveau(x) enseigné(s), heures/semaine et discipline
      </span>
      {rows.length === 0 && (
        <p className="mt-1.5 text-sm text-stone-400 dark:text-stone-500">Aucun niveau déclaré.</p>
      )}
      <div className="mt-1.5 space-y-2">
        {rows.map((row) => {
          const isAutre = row.discipline === AUTRE_DISCIPLINE_VALUE;
          return (
            <div key={row.id} className="rounded-lg border border-stone-200 p-2.5 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <select name="level" required defaultValue={row.level} className="input-field flex-1">
                  <option value="" disabled>
                    — Niveau —
                  </option>
                  {TEACHING_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  name="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="99"
                  required
                  defaultValue={row.hours}
                  placeholder="Heures/sem."
                  className="input-field w-32"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= minRows}
                  className="rounded-lg px-2 py-2 text-sm text-stone-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-stone-500 dark:hover:text-red-400"
                  aria-label="Retirer ce niveau"
                >
                  ✕
                </button>
              </div>
              <select
                name="discipline"
                required
                defaultValue={row.discipline}
                onChange={(e) => setDiscipline(row.id, e.target.value)}
                className="input-field mt-2"
              >
                <option value="" disabled>
                  — Discipline —
                </option>
                {DISCIPLINE_GROUPS.map((group) => (
                  <optgroup key={group.famille} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {/* Toujours présent (même masqué) pour que les tableaux
                  parallèles lus par parseLevelHoursFromFormData restent
                  alignés par index — seul son contenu compte quand
                  discipline === "autre". */}
              <input
                type={isAutre ? "text" : "hidden"}
                name="disciplinePrecision"
                required={isAutre}
                defaultValue={row.precision}
                placeholder="Précisez la discipline"
                className={isAutre ? "input-field mt-2" : ""}
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-500"
      >
        + Ajouter un niveau
      </button>
    </div>
  );
}
