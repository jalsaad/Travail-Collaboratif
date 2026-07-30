// Version lecture seule (server-renderable) du widget étoiles, pour
// /admin/utilisateurs — même dégradé bleu → sarcelle que
// components/satisfaction-stars.tsx, sans interactivité.
export function SatisfactionStarsDisplay({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-xs text-stone-400 dark:text-stone-500">—</span>;
  }

  return (
    <div className="flex gap-0.5" title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill={value <= rating ? "url(#satisfaction-display-gradient)" : "none"}
          stroke={value <= rating ? "none" : "currentColor"}
          strokeWidth={1.5}
        >
          <path
            strokeLinejoin="round"
            d="M12 2.5l2.9 6.2 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7z"
            className={value <= rating ? "" : "text-stone-300 dark:text-stone-600"}
          />
        </svg>
      ))}
    </div>
  );
}

// Définition partagée du dégradé, à monter une seule fois par page (cf.
// app/admin/utilisateurs/page.tsx) — chaque SatisfactionStarsDisplay
// référence le même id.
export function SatisfactionGradientDef() {
  return (
    <svg width="0" height="0" aria-hidden="true">
      <defs>
        <linearGradient id="satisfaction-display-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-600)" />
          <stop offset="100%" stopColor="var(--color-brand-teal)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
