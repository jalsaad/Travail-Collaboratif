"use client";

import { useState } from "react";
import type { ExternalParticipantStatus } from "@prisma/client";
import {
  EXTERNAL_PARTICIPANT_STATUSES,
  MAX_EXTERNAL_PARTICIPANTS,
} from "@/lib/external-participants";

export type ExternalParticipantDraft = { fullName: string; status: ExternalParticipantStatus };

// Personnes présentes sans relever de l'obligation de travail collaboratif
// enseignant. Deux champs jumelés plutôt qu'une ligne de texte libre : le
// statut alimente les relevés et doit rester comparable d'une école à l'autre.
//
// Les lignes partent en champs parallèles (externalName[i] / externalStatus[i]),
// appariés par leur rang à la lecture — c'est ainsi que FormData.getAll rend
// les valeurs, dans l'ordre du document.
export function ExternalParticipantsField({
  initial = [],
}: {
  initial?: ExternalParticipantDraft[];
}) {
  const [lignes, setLignes] = useState<ExternalParticipantDraft[]>(initial);

  const modifier = (index: number, champ: Partial<ExternalParticipantDraft>) =>
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...champ } : l)));

  return (
    <div className="space-y-2">
      {lignes.map((ligne, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            name="externalName"
            value={ligne.fullName}
            onChange={(e) => modifier(index, { fullName: e.target.value })}
            placeholder="Nom et prénom"
            aria-label={`Nom de la personne ${index + 1}`}
            className="input-field flex-1"
          />
          <select
            name="externalStatus"
            value={ligne.status}
            onChange={(e) => modifier(index, { status: e.target.value as ExternalParticipantStatus })}
            aria-label={`Statut de la personne ${index + 1}`}
            className="input-field w-44 shrink-0"
          >
            {EXTERNAL_PARTICIPANT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setLignes((prev) => prev.filter((_, i) => i !== index))}
            aria-label={`Retirer la personne ${index + 1}`}
            className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}

      {lignes.length < MAX_EXTERNAL_PARTICIPANTS && (
        <button
          type="button"
          onClick={() => setLignes((prev) => [...prev, { fullName: "", status: "EDUCATEUR" }])}
          className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-stone-600 dark:text-stone-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
        >
          + Ajouter une personne
        </button>
      )}
    </div>
  );
}
