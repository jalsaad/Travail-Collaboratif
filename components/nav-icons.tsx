// Pictogrammes du menu, tracés en ligne plutôt qu'apportés par une
// bibliothèque : huit icônes ne justifient pas une dépendance, et les tracés
// suivent le style déjà employé ailleurs (contour, épaisseur 1.7).
type IconProps = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: className ?? "h-4 w-4 shrink-0",
  "aria-hidden": true,
});

export function IconPeriodes({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 2v3M16 2v3M3.5 9h17M4.5 5.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path d="M8 13h3M8 16.5h6" />
    </svg>
  );
}

export function IconDeclarer({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.5 18.5l-4 1 1-4Z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

export function IconTableauDeBord({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 20.5V13M9 20.5V5M14.5 20.5v-9M20 20.5V8.5" />
    </svg>
  );
}

export function IconParametres({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function IconJournal({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 2.5h8.5L19 7v14.5H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z" />
      <path d="M14 2.5V7h5M8.5 12h7M8.5 16h5" />
    </svg>
  );
}

export function IconEcole({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3 2.5 8l9.5 5 9.5-5L12 3Z" />
      <path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" />
    </svg>
  );
}

export function IconAssistance({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2v.4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconPlateforme({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 2.5 4.5 5.5v6c0 4.5 3.2 8.4 7.5 9.5 4.3-1.1 7.5-5 7.5-9.5v-6L12 2.5Z" />
      <path d="M9.5 12l1.8 1.8 3.5-3.6" />
    </svg>
  );
}
