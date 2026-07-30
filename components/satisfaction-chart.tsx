// Un seul hue (dégradé de marque bleu → sarcelle, cf. components/
// satisfaction-stars.tsx) : la longueur des barres encode déjà l'ampleur
// (nombre d'avis par note), aucune palette catégorielle n'est nécessaire
// pour une seule série — cf. skill dataviz, "sequential = one hue". Chaque
// barre porte son compte + pourcentage en clair (jamais la couleur seule).
export function SatisfactionChart({
  distribution,
  total,
  average,
}: {
  distribution: { rating: number; count: number }[];
  total: number;
  average: number | null;
}) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  const roundedAverage = average !== null ? Math.round(average) : 0;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
        <p className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {average !== null ? average.toFixed(1) : "—"}
          <span className="text-lg font-normal text-stone-400 dark:text-stone-500">/5</span>
        </p>
        <div>
          <div className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((value) => (
              <svg
                key={value}
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill={value <= roundedAverage ? "url(#satisfaction-chart-gradient)" : "none"}
                stroke={value <= roundedAverage ? "none" : "currentColor"}
                strokeWidth={1.5}
              >
                <path
                  strokeLinejoin="round"
                  d="M12 2.5l2.9 6.2 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7z"
                  className={value <= roundedAverage ? "" : "text-stone-300 dark:text-stone-600"}
                />
              </svg>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{total} avis</p>
        </div>
      </div>

      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <linearGradient id="satisfaction-chart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-600)" />
            <stop offset="100%" stopColor="var(--color-brand-teal)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-4 space-y-2">
        {distribution.map(({ rating, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const widthPct = (count / maxCount) * 100;
          return (
            <div key={rating} className="flex items-center gap-3 text-xs">
              <span className="w-16 shrink-0 text-stone-500 dark:text-stone-400">
                {rating} étoile{rating > 1 ? "s" : ""}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-teal transition-all"
                  style={{ width: `${widthPct}%` }}
                  title={`${count} avis (${pct}%)`}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-stone-500 dark:text-stone-400">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
