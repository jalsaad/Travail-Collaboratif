"use client";

import { useCallback, useState } from "react";
import { useActionState } from "react";
import { joinSchoolWithCode, type JoinSchoolState } from "@/app/(app)/rejoindre-ecole/actions";
import { SchoolChoiceFields, type SchoolChoiceMode } from "@/components/school-choice-fields";
import { LevelHoursPicker } from "@/components/level-hours-picker";

const initialState: JoinSchoolState = {};

export function JoinSchoolForm() {
  const [state, formAction, pending] = useActionState(joinSchoolWithCode, initialState);
  // Mêmes chemins qu'à l'inscription (cf. components/school-choice-fields.tsx) :
  // un enseignant déjà rattaché doit pouvoir rejoindre une autre école par
  // code, en la cherchant par son nom, ou en l'initiant librement.
  const [choix, setChoix] = useState<{ mode: SchoolChoiceMode; prete: boolean }>({
    mode: "school",
    prete: false,
  });
  const onChoixChange = useCallback(
    (etat: { mode: SchoolChoiceMode; prete: boolean }) => setChoix(etat),
    []
  );

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <SchoolChoiceFields onChange={onChoixChange} />

      <div className="border-t border-stone-100 pt-4 dark:border-stone-800">
        <LevelHoursPicker />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending || !choix.prete} className="btn-primary">
        {pending
          ? "Rattachement..."
          : choix.mode === "initiate"
            ? "Créer le cercle de mon école"
            : "Rejoindre cette école"}
      </button>
    </form>
  );
}
