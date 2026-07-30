import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/animated-number";

// Tuile de statistique du tableau de bord admin : badge d'icône en dégradé
// de marque, nombre qui s'anime à l'affichage, léger effet de survol —
// cf. app/admin/page.tsx.
export function AdminStatTile({
  icon,
  value,
  decimals = 0,
  label,
}: {
  icon: ReactNode;
  value: number;
  decimals?: number;
  label: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-600 to-brand-teal opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-teal text-white">
          {icon}
        </span>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            <AnimatedNumber value={value} decimals={decimals} />
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
