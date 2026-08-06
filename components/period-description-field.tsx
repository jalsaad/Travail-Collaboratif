// Description de la période, partagée par les trois formulaires.
//
// Le rappel sous le champ reprend le vade-mecum annexé à la circulaire 7167,
// §8 : « la finalité du travail collaboratif est l'élève et ses
// apprentissages. Il ne doit pas concerner le champ purement organisationnel
// (ex. : pas la confection des horaires). »
//
// Volontairement informatif et non bloquant : le même vade-mecum laisse
// l'appréciation à l'école (« chaque établissement scolaire est libre de
// définir les modalités du contrôle de ses pratiques collaboratives ») et
// met en garde contre « le contrôle technocratique ».
export function PeriodDescriptionField({ defaultValue }: { defaultValue?: string }) {
  return (
    <div>
      <label
        htmlFor="description"
        className="block text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        Description
      </label>
      <textarea
        id="description"
        name="description"
        required
        rows={3}
        defaultValue={defaultValue}
        className="input-field mt-1.5"
      />
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        L&apos;élève et ses apprentissages doivent être au centre de l&apos;activité. Le travail
        purement organisationnel — la confection des horaires, par exemple — ne relève pas du
        travail collaboratif.
      </p>
    </div>
  );
}
