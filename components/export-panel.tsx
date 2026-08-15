export type ExportPanelMember = { userId: string; name: string };

// Formulaire GET natif (aucun JS requis pour déclencher le téléchargement) :
// la portée (personne seule / lot / toute l'école) se déduit côté serveur du
// nombre de cases "userIds" cochées, donc aucun sélecteur de portée séparé
// n'est nécessaire ici — cf. app/api/export/school/route.ts.
export function ExportPanel({
  action,
  members,
  fixedUserId,
}: {
  action: string;
  members?: ExportPanelMember[];
  /// Relevé d'UNE personne déjà désignée par le contexte (fiche membre) :
  /// la portée part en champ caché plutôt qu'en case à cocher, le serveur la
  /// déduisant du nombre d'userIds reçus comme pour la sélection libre.
  fixedUserId?: string;
}) {
  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/60"
    >
      {fixedUserId && <input type="hidden" name="userIds" value={fixedUserId} />}

      {members && members.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Personnes concernées (aucune sélection = toute l&rsquo;école)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((m) => (
              <label
                key={m.userId}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              >
                <input type="checkbox" name="userIds" value={m.userId} className="h-3.5 w-3.5" />
                {m.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-stone-600 dark:text-stone-400">
          Du
          <input
            type="date"
            name="start"
            className="mt-1 block rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:[color-scheme:dark]"
          />
        </label>
        <label className="text-xs text-stone-600 dark:text-stone-400">
          Au
          <input
            type="date"
            name="end"
            className="mt-1 block rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:[color-scheme:dark]"
          />
        </label>
        <button type="submit" name="format" value="pdf" className="btn-primary">
          Exporter (PDF)
        </button>
      </div>
    </form>
  );
}
