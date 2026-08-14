import Link from "next/link";

/// Année scolaire en cours, épinglée sous le bouton de bascule clair/sombre
/// (`fixed right-4 top-4`, h-9, cf. components/theme-toggle.tsx) : `top-16`
/// la place juste dessous, alignée sur le même bord.
///
/// Réduite au strict libellé — « 2026-2027 » — pour ne pas encombrer le coin
/// de l'écran. L'intitulé complet reste accessible en infobulle.
///
/// Montée depuis les layouts authentifiés, jamais depuis le layout racine :
/// l'année n'a aucun sens sur les pages publiques.
export function SchoolYearBadge({
  label,
  adminLink = false,
}: {
  label: string | null;
  /// Rend la pastille cliquable vers l'écran de création quand aucune année
  /// n'est ouverte — réservé au superadmin, seul habilité à en ouvrir une.
  adminLink?: boolean;
}) {
  const position = "fixed right-4 top-16 z-50";

  if (!label) {
    const contenu = (
      <span
        title="Aucune année scolaire ouverte : les périodes ne peuvent pas être déclarées."
        className="block rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-lg dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
      >
        Aucune année
      </span>
    );
    return adminLink ? (
      <Link href="/admin/archives" className={position}>
        {contenu}
      </Link>
    ) : (
      <div className={position}>{contenu}</div>
    );
  }

  return (
    <div className={position}>
      <span
        title={`Année scolaire ${label}`}
        className="block rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 shadow-lg dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
      >
        {label}
      </span>
    </div>
  );
}
