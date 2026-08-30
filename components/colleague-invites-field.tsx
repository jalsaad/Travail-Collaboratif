"use client";

import { useState } from "react";

export type ColleagueInviteDraft = { fullName: string; email: string };

/// Plafond aligné sur celui des personnes extérieures (cf.
/// lib/external-participants.ts) : au-delà, on n'est plus dans le petit
/// cercle de collaboration que ce champ sert à amorcer.
export const MAX_COLLEAGUE_INVITES = 10;

// Collègues qui n'ont pas encore de compte, invités depuis la déclaration
// elle-même : chacun reçoit un lien de parrainage rattaché à CETTE période,
// donc créer son compte vaut confirmation de sa participation (cf.
// app/(auth)/rejoindre/parrainage/[token]/actions.ts).
//
// Indispensable dans une école pas encore inscrite officiellement, où le
// sélecteur de collègues est vide au départ : sans ce champ, la première
// personne n'a personne à taguer et ne peut rien faire d'utile.
//
// Les lignes partent en champs parallèles (inviteeName[i] / inviteeEmail[i]),
// appariés par leur rang à la lecture — même convention que les personnes
// extérieures et que les niveaux/heures.
export function ColleagueInvitesField({ initial = [] }: { initial?: ColleagueInviteDraft[] }) {
  const [lignes, setLignes] = useState<ColleagueInviteDraft[]>(initial);

  const modifier = (index: number, champ: Partial<ColleagueInviteDraft>) =>
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...champ } : l)));

  return (
    <div className="space-y-2">
      {lignes.map((ligne, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            name="inviteeName"
            value={ligne.fullName}
            onChange={(e) => modifier(index, { fullName: e.target.value })}
            placeholder="Nom et prénom"
            aria-label={`Nom du·de la collègue ${index + 1}`}
            className="input-field flex-1"
          />
          <input
            name="inviteeEmail"
            type="email"
            value={ligne.email}
            onChange={(e) => modifier(index, { email: e.target.value })}
            placeholder="email@ecole.be"
            aria-label={`Email du·de la collègue ${index + 1}`}
            className="input-field w-52 shrink-0"
          />
          <button
            type="button"
            onClick={() => setLignes((prev) => prev.filter((_, i) => i !== index))}
            aria-label={`Retirer le·la collègue ${index + 1}`}
            className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}

      {lignes.length < MAX_COLLEAGUE_INVITES && (
        <button
          type="button"
          onClick={() => setLignes((prev) => [...prev, { fullName: "", email: "" }])}
          className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-stone-600 dark:text-stone-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
        >
          + Inviter un·e collègue
        </button>
      )}
    </div>
  );
}
