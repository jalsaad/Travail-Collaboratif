import Link from "next/link";

/// Année scolaire en cours, affichée en permanence dans chaque espace.
///
/// Tous les compteurs, relevés et écrans de périodes sont bornés à cette
/// année : sans elle à l'écran, un enseignant qui voit son compteur repartir
/// de zéro après un archivage n'a aucun moyen de comprendre pourquoi.
///
/// `label` à null signale qu'aucune année n'est ouverte — cas où plus rien ne
/// peut être déclaré, d'où l'avertissement plutôt qu'un affichage vide.
export function SchoolYearBadge({
  label,
  adminLink = false,
  className = "",
}: {
  label: string | null;
  /// Ajoute un lien vers l'écran de création — réservé au superadmin, seul
  /// habilité à ouvrir une année.
  adminLink?: boolean;
  className?: string;
}) {
  if (!label) {
    return (
      <p
        className={`inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300 ${className}`}
      >
        Aucune année scolaire ouverte — les périodes ne peuvent pas être déclarées.
        {adminLink && (
          <Link href="/admin/archives" className="font-semibold underline">
            En ouvrir une
          </Link>
        )}
      </p>
    );
  }

  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300 ${className}`}
    >
      <span className="text-stone-400 dark:text-stone-500">Année scolaire</span>
      <span className="font-semibold text-stone-800 dark:text-stone-100">{label}</span>
    </p>
  );
}
