import type { SatisfactionPublique } from "@/lib/satisfaction";

/// Un seul exemplaire par page : l'identifiant du dégradé est donc figé,
/// plutôt que tiré d'un `useId` qui imposerait un composant client pour un
/// bloc entièrement statique.
const GRADIENT_ID = "satisfaction-summary-gradient";

const CHEMIN_ETOILE =
  "M12 2.5l2.9 6.2 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7z";

function Etoiles({ fill }: { fill: string }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill={fill} aria-hidden="true">
          <path d={CHEMIN_ETOILE} />
        </svg>
      ))}
    </div>
  );
}

/// Résultat public des évaluations.
///
/// Le composant n'est monté que lorsque le seuil d'avis est atteint (cf.
/// lib/satisfaction.ts::MIN_AVIS_PUBLIC) : il n'a donc aucun cas « pas assez
/// de données » à gérer.
export function SatisfactionSummary({ moyenne, total }: SatisfactionPublique) {
  // Les étoiles pleines sont découpées à la moyenne : 4,6 / 5 remplit 92 % de
  // la rangée, donc quatre étoiles et les trois cinquièmes de la suivante. Un
  // arrondi à l'étoile entière mentirait d'un dixième dans un sens ou l'autre.
  const pourcentage = Math.max(0, Math.min(100, (moyenne / 5) * 100));
  const moyenneLisible = moyenne.toFixed(1).replace(".", ",");

  return (
    <div className="flex flex-col items-center">
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-600)" />
            <stop offset="100%" stopColor="var(--color-brand-teal)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Deux rangées superposées : la grise en fond, la colorée par-dessus,
          rognée à la largeur de la moyenne. `w-max` sur la rangée intérieure
          l'empêche de se comprimer dans le conteneur rétréci — sans lui, les
          cinq étoiles se tasseraient au lieu d'être coupées. */}
      <div
        className="relative inline-block text-stone-300 dark:text-stone-600"
        role="img"
        aria-label={`${moyenneLisible} sur 5, moyenne de ${total} avis`}
      >
        <Etoiles fill="currentColor" />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pourcentage}%` }}>
          <div className="w-max">
            <Etoiles fill={`url(#${GRADIENT_ID})`} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
        <span className="text-base font-bold text-stone-900 dark:text-stone-100">
          {moyenneLisible}
        </span>{" "}
        sur 5 — {total} avis d&apos;utilisateurs
      </p>
    </div>
  );
}
