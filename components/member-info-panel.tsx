import type { TeachingLevel } from "@prisma/client";
import { TEACHING_LEVEL_OPTIONS } from "@/lib/teaching-levels";
import { formatPeriodes } from "@/lib/period-duration";

const LEVEL_LABEL = new Map(TEACHING_LEVEL_OPTIONS.map((o) => [o.value, o.label]));

/// Fiche de consultation d'un membre, à l'usage de la direction : ce qu'elle
/// a besoin de savoir sur une personne sans avoir à ouvrir un formulaire.
/// Strictement en lecture — aucun champ, aucune action.
export function MemberInfoPanel({
  fullName,
  levelHours,
  done,
  objective,
  otherSchools,
  lastLoginAt,
}: {
  fullName: string;
  levelHours: { level: TeachingLevel; hours: string; discipline: string }[];
  done: number;
  objective: number;
  /// Périodes faites dans les autres écoles de la personne, ou null si elle
  /// n'enseigne qu'ici — la ligne est alors omise plutôt qu'affichée à zéro.
  otherSchools: number | null;
  lastLoginAt: Date | null;
}) {
  const enseignement =
    levelHours.length > 0
      ? levelHours
          .map(
            (l) =>
              `${LEVEL_LABEL.get(l.level) ?? l.level} — ${l.discipline} (${formatPeriodes(l.hours)} h/sem.)`
          )
          .join(", ")
      : "non renseigné";

  const connexion = lastLoginAt
    ? `${lastLoginAt.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} à ${lastLoginAt.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}`
    : "jamais connecté·e";

  const lignes: [string, string][] = [
    ["Nom et prénom", fullName],
    ["Enseignement", enseignement],
    [
      "Travail collaboratif",
      otherSchools !== null
        ? `${formatPeriodes(done)} période(s) dans cette école · ${formatPeriodes(otherSchools)} dans un autre établissement · ${formatPeriodes(done + otherSchools)} au total, pour un objectif de ${formatPeriodes(objective)}`
        : `${formatPeriodes(done)} période(s) sur un objectif de ${formatPeriodes(objective)}`,
    ],
    ["Dernière connexion", connexion],
  ];

  return (
    <div className="card p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">Informations</h2>
      <dl className="mt-3 space-y-2.5">
        {lignes.map(([label, valeur]) => (
          <div key={label} className="sm:flex sm:gap-4">
            <dt className="shrink-0 text-xs text-stone-500 sm:w-40 sm:pt-0.5 dark:text-stone-400">
              {label}
            </dt>
            <dd className="text-sm text-stone-900 dark:text-stone-100">{valeur}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
        Consultation seule. Les périodes sont celles de l&apos;année scolaire en cours.
      </p>
    </div>
  );
}
