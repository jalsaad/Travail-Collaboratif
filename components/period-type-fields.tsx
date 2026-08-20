"use client";

import { useState } from "react";
import type { PeriodType } from "@prisma/client";
import { activitiesForForm, COLLABORATIVE_ACTIVITIES } from "@/lib/collaborative-activities";
import { periodTypeLabel } from "@/lib/period-labels";
import { CirculaireLink } from "@/components/circulaire-link";

// Deux niveaux de qualification, partagés par les trois formulaires :
//  - la forme légale (PeriodType), seule à avoir valeur normative et dont la
//    direction doit pouvoir suivre l'équilibre (circulaire 7167) ;
//  - la nature de l'activité, thème indicatif issu du vade-mecum §8, dont la
//    liste proposée dépend de la forme choisie.
export function PeriodTypeFields({
  defaultType = "COLLABORATION_PEDAGOGIQUE",
  defaultNatureActivite = "",
}: {
  defaultType?: string;
  defaultNatureActivite?: string;
}) {
  const [type, setType] = useState<PeriodType>(defaultType as PeriodType);
  const [nature, setNature] = useState(defaultNatureActivite);

  const available = activitiesForForm(type);
  // Une période déjà enregistrée peut porter un thème qui ne figure pas dans
  // la liste de la forme actuellement sélectionnée : on le conserve tant que
  // la personne n'en choisit pas un autre, pour ne pas l'effacer en silence.
  const selectedOutsideList =
    nature !== "" && !available.some((a) => a.slug === nature)
      ? COLLABORATIVE_ACTIVITIES.find((a) => a.slug === nature)
      : undefined;

  const hint = COLLABORATIVE_ACTIVITIES.find((a) => a.slug === nature)?.hint;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Forme de travail collaboratif
        </label>
        <select
          id="type"
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as PeriodType)}
          className="input-field mt-1.5"
        >
          <option value="COLLABORATION_PEDAGOGIQUE">{periodTypeLabel.COLLABORATION_PEDAGOGIQUE}</option>
          <option value="REUNION_EQUIPE">{periodTypeLabel.REUNION_EQUIPE}</option>
        </select>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Les deux seules formes prévues par les circulaires <CirculaireLink numero="7167" /> et{" "}
          <CirculaireLink numero="8894" /> : réunions d&apos;équipe à l&apos;initiative de la
          direction, collaboration pédagogique à l&apos;initiative des enseignant·es.
        </p>
      </div>

      <div>
        <label
          htmlFor="natureActivite"
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Nature de l&apos;activité <span className="font-normal text-stone-400">(facultatif)</span>
        </label>
        <select
          id="natureActivite"
          name="natureActivite"
          value={nature}
          onChange={(e) => setNature(e.target.value)}
          className="input-field mt-1.5"
        >
          <option value="">— Non précisée —</option>
          {selectedOutsideList && (
            <option value={selectedOutsideList.slug}>{selectedOutsideList.label}</option>
          )}
          {available.map((activity) => (
            <option key={activity.slug} value={activity.slug}>
              {activity.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {hint ?? (
            <>
              Pistes suggérées par le vade-mecum des circulaires <CirculaireLink numero="7167" /> et{" "}
              <CirculaireLink numero="8894" /> ; la liste n&apos;est pas imposée, choisissez «
              Autre » au besoin.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
