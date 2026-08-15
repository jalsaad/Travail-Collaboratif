import Link from "next/link";

/// Année scolaire en cours, affichée dans le tiroir de navigation entre le
/// logo et le nom de l'école — au plus près du contexte qu'elle qualifie,
/// plutôt qu'épinglée dans un coin de l'écran.
///
/// Réduite au strict libellé, « 2026-2027 » ; l'intitulé complet reste en
/// infobulle. Montée depuis les tiroirs authentifiés uniquement : l'année n'a
/// aucun sens sur les pages publiques.
export function SchoolYearBadge({
  label,
  adminLink = false,
}: {
  label: string | null;
  /// Rend la pastille cliquable vers l'écran de création quand aucune année
  /// n'est ouverte — réservé au superadmin, seul habilité à en ouvrir une.
  adminLink?: boolean;
  /// Referme le tiroir au clic, comme les autres liens qu'il contient.
}) {
  if (!label) {
    const contenu = (
      <span
        title="Aucune année scolaire ouverte : les périodes ne peuvent pas être déclarées."
        className="inline-block rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
      >
        Aucune année
      </span>
    );
    return adminLink ? <Link href="/admin/archives">{contenu}</Link> : contenu;
  }

  return (
    <span
      title={`Année scolaire ${label}`}
      className="inline-block rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
    >
      {label}
    </span>
  );
}
