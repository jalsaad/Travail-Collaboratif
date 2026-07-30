"use client";

import { useState } from "react";
import { TEACHING_LEVEL_OPTIONS } from "@/lib/teaching-levels";

let nextRowId = 0;

type DefaultRow = { level: string; hours: number; discipline: string };

// Lignes répétables niveau + heures/semaine + discipline, soumises comme
// trois tableaux parallèles (name="level"/"hours"/"discipline") — même
// pattern que colleagueMembershipIds ailleurs dans ce projet, lu côté serveur
// via parseLevelHoursFromFormData (lib/teaching-levels.ts). La discipline
// est rattachée à CHAQUE ligne (juste sous son niveau) plutôt qu'être un
// champ unique pour toute la Membership : un même niveau peut être ajouté
// plusieurs fois si l'enseignant y donne plusieurs disciplines.
export function LevelHoursPicker({
  defaultValues,
  disciplines,
  minRows = 1,
}: {
  defaultValues?: DefaultRow[];
  disciplines: string[];
  // 0 pour un rôle qui ne donne pas nécessairement cours (cf.
  // components/teaching-info-form.tsx) — 1 (par défaut) pour les parcours
  // d'inscription ENSEIGNANT, où au moins une déclaration est requise.
  minRows?: number;
}) {
  const initialRows: { level: string; hours?: number; discipline: string }[] =
    defaultValues && defaultValues.length > 0
      ? defaultValues
      : minRows > 0
        ? [{ level: "", hours: undefined, discipline: "" }]
        : [];
  const [rows, setRows] = useState<{ id: number; level: string; hours?: number; discipline: string }[]>(() =>
    initialRows.map((r) => ({ id: nextRowId++, level: r.level, hours: r.hours, discipline: r.discipline }))
  );

  function addRow() {
    setRows((r) => [...r, { id: nextRowId++, level: "", hours: undefined, discipline: "" }]);
  }

  function removeRow(id: number) {
    setRows((r) => (r.length > minRows ? r.filter((row) => row.id !== id) : r));
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
        {rows.map((row) => (
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
            <input
              name="discipline"
              list="level-hours-discipline-options"
              required
              defaultValue={row.discipline}
              placeholder="Discipline enseignée dans ce niveau"
              className="input-field mt-2"
            />
          </div>
        ))}
      </div>
      <datalist id="level-hours-discipline-options">
        {disciplines.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
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
