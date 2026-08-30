"use client";

import { useEffect, useState } from "react";
import type { JoinableSchool } from "@/app/(auth)/rejoindre/actions";
import { JoinableSchoolSearch } from "@/components/joinable-school-search";
import { SchoolNameSearch } from "@/components/school-name-search";

export type SchoolChoiceMode = "code" | "school" | "initiate";

// Choix de l'école, commun aux deux parcours de rattachement : la création de
// compte (components/join-form.tsx) et l'ajout d'une école à un compte
// existant (components/join-school-form.tsx). Les deux offrent exactement les
// mêmes chemins, d'où ce composant partagé plutôt qu'un formulaire limité au
// seul code d'un côté et complet de l'autre.
//
// Les champs partent sous les mêmes noms dans les deux cas (joinMode, code,
// schoolId, numeroFase, directionEmail) : c'est le contrat attendu par les
// deux actions serveur.

// Choix retenu : le dégradé bleu → sarcelle de .btn-primary (cf.
// app/globals.css), pour que la sélection se lise comme une action de la
// plateforme et non comme un onglet neutre. Choix disponible : encadré sobre,
// qui laisse le dégradé seul porter l'accent.
const choixEcole = (actif: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
    actif
      ? "bg-gradient-to-r from-brand-600 to-brand-teal text-white shadow-sm shadow-brand-600/20"
      : "border border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-brand-700 dark:hover:text-brand-400"
  }`;

const labelColonne =
  "flex min-h-[26px] items-start px-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wider text-stone-400 dark:text-stone-500";

export function SchoolChoiceFields({
  defaultCode = "",
  onChange,
}: {
  defaultCode?: string;
  /// Prévient le parent de l'état du choix : `prete` vaut faux tant qu'aucune
  /// école n'est désignée, pour qu'il puisse désactiver son bouton d'envoi.
  onChange?: (etat: { mode: SchoolChoiceMode; prete: boolean }) => void;
}) {
  // "code" par défaut seulement quand un lien d'affiche (cf.
  // lib/join-poster.ts) l'a déjà rempli en query param — sinon la recherche
  // par nom est le chemin le plus probable, la plupart des enseignants
  // n'ayant pas le code sous les yeux au moment de s'inscrire.
  const [mode, setMode] = useState<SchoolChoiceMode>(defaultCode ? "code" : "school");
  const [selectedSchool, setSelectedSchool] = useState<JoinableSchool | null>(null);
  const [numeroFaseAInitier, setNumeroFaseAInitier] = useState<string | null>(null);

  const prete =
    mode === "code" ||
    (mode === "school" && !!selectedSchool) ||
    (mode === "initiate" && !!numeroFaseAInitier);

  useEffect(() => {
    onChange?.({ mode, prete });
    // `onChange` est souvent une lambda recréée à chaque rendu du parent :
    // l'inclure ici relancerait l'effet en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, prete]);

  return (
    <>
      {/* Deux familles de situations, pas trois chemins équivalents : selon que
          l'école est déjà sur la plateforme ou pas encore. Le regroupement en
          colonnes évite de faire chercher à l'enseignant·e lequel des trois
          boutons le concerne. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className={labelColonne}>École inscrite</span>
          <button type="button" onClick={() => setMode("code")} className={choixEcole(mode === "code")}>
            J&apos;ai un code
          </button>
          <button type="button" onClick={() => setMode("school")} className={choixEcole(mode === "school")}>
            Chercher mon école
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelColonne}>École pas encore inscrite</span>
          <button
            type="button"
            onClick={() => setMode("initiate")}
            className={`${choixEcole(mode === "initiate")} flex-1`}
          >
            Inscription libre
          </button>
        </div>
      </div>

      <input type="hidden" name="joinMode" value={mode === "initiate" ? "initiate" : "join"} />

      {mode === "code" && (
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Code de rattachement
          </label>
          <input
            id="code"
            name="code"
            defaultValue={defaultCode}
            placeholder="ex: TILL-2026-8K3"
            className="input-field mt-1.5 uppercase"
          />
        </div>
      )}

      {mode === "school" && (
        <div>
          <JoinableSchoolSearch onSelect={setSelectedSchool} selected={selectedSchool} />
          <input type="hidden" name="schoolId" value={selectedSchool?.id ?? ""} />
          <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
            Seules les écoles déjà inscrites et rattachables apparaissent dans les résultats.
          </p>
        </div>
      )}

      {mode === "initiate" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-xs text-stone-600 dark:border-brand-900 dark:bg-brand-950/40 dark:text-stone-400">
            Vous réunissez ici votre petit cercle de collègues. Vous restez enseignant·e — aucun droit
            de gestion sur l&apos;école ne vous est attribué. Votre direction sera informée par email et
            pourra inscrire l&apos;école officiellement pour en faire bénéficier toute l&apos;équipe.
          </div>
          <SchoolNameSearch onSelect={setNumeroFaseAInitier} />
          <input type="hidden" name="numeroFase" value={numeroFaseAInitier ?? ""} />
          <div>
            <label htmlFor="directionEmail" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Email de votre direction
            </label>
            <input
              id="directionEmail"
              name="directionEmail"
              type="email"
              required
              placeholder="ex: direction@ecole.be"
              className="input-field mt-1.5"
            />
          </div>
        </div>
      )}
    </>
  );
}
