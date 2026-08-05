// 4e colonne du formulaire officiel de recensement annexé à la circulaire
// 7167 : « En lien éventuel avec quels objectifs du plan de pilotage ? ».
// Facultative dans le formulaire officiel, donc facultative ici aussi.
export function PilotageObjectivesField({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <div>
      <label
        htmlFor="objectifsPilotage"
        className="block text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        Objectifs du plan de pilotage <span className="font-normal text-stone-400">(facultatif)</span>
      </label>
      <textarea
        id="objectifsPilotage"
        name="objectifsPilotage"
        rows={2}
        maxLength={500}
        defaultValue={defaultValue}
        className="input-field mt-1.5"
      />
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        En lien éventuel avec quels objectifs du contrat d&apos;objectifs de l&apos;école ?
      </p>
    </div>
  );
}
