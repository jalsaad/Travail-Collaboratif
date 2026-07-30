"use client";

import { useState } from "react";
import { TEACHING_LEVEL_OPTIONS } from "@/lib/teaching-levels";

let nextRowId = 0;

// Lignes répétables niveau + heures/semaine, soumises comme deux tableaux
// parallèles (name="level"/name="hours") — même pattern que
// colleagueMembershipIds ailleurs dans ce projet, lu côté serveur via
// parseLevelHoursFromFormData (lib/teaching-levels.ts).
export function LevelHoursPicker() {
  const [rows, setRows] = useState<number[]>(() => [nextRowId++]);

  function addRow() {
    setRows((r) => [...r, nextRowId++]);
  }

  function removeRow(id: number) {
    setRows((r) => (r.length > 1 ? r.filter((rowId) => rowId !== id) : r));
  }

  return (
    <div>
      <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        Niveau(x) enseigné(s) et heures/semaine
      </span>
      <div className="mt-1.5 space-y-2">
        {rows.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <select name="level" required defaultValue="" className="input-field flex-1">
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
              placeholder="Heures/sem."
              className="input-field w-32"
            />
            <button
              type="button"
              onClick={() => removeRow(id)}
              disabled={rows.length === 1}
              className="rounded-lg px-2 py-2 text-sm text-stone-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-stone-500 dark:hover:text-red-400"
              aria-label="Retirer ce niveau"
            >
              ✕
            </button>
          </div>
        ))}
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
