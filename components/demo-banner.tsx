import Link from "next/link";

// Bandeau permanent de la session de démonstration. Annoncer d'emblée que
// rien ne s'enregistre vaut mieux que de le découvrir en cliquant
// « Enregistrer » : la direction explore alors sans se demander si elle
// abîme quelque chose.
export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
        <span className="font-semibold">Espace de démonstration</span>
        <span className="text-amber-700 dark:text-amber-300/90">
          — école et enseignant·es fictifs. Explorez librement : rien n&apos;est enregistré.
        </span>
        <Link
          href="/creer-ecole"
          className="ml-auto shrink-0 font-semibold underline underline-offset-2 transition hover:text-amber-950 dark:hover:text-amber-100"
        >
          Inscrire mon école
        </Link>
      </div>
    </div>
  );
}
