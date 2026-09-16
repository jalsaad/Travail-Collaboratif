import Link from "next/link";

// Bouton « Voir plus » des listes de périodes. Un lien, pas un bouton :
// l'allongement de la liste se joue dans l'URL (cf. lib/period-pagination.ts),
// donc il reste fonctionnel sans JavaScript, se partage et se recharge.
export function VoirPlusPeriodes({
  limiteSuivante,
  /// Conserve les autres paramètres de l'URL — un filtre en place ne doit pas
  /// sauter parce qu'on a demandé à en voir davantage.
  params,
  affichees,
}: {
  limiteSuivante: number;
  params?: Record<string, string | undefined>;
  affichees: number;
}) {
  const query = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params ?? {})) {
    if (valeur) query.set(cle, valeur);
  }
  query.set("periodes", String(limiteSuivante));

  return (
    <div className="flex flex-col items-center gap-1.5 pt-3">
      <Link
        href={`?${query.toString()}`}
        scroll={false}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
      >
        Voir plus de périodes
      </Link>
      <p className="text-xs text-stone-400 dark:text-stone-500">
        {affichees} période(s) affichée(s) — les plus récentes d&apos;abord.
      </p>
    </div>
  );
}
