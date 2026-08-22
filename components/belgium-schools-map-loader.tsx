"use client";

import dynamic from "next/dynamic";
import type { SchoolPoint } from "@/components/belgium-schools-map";

// Enveloppe cliente du chargement de la carte.
//
// Leaflet manipule `window` dès son import : le composant ne peut pas être
// rendu côté serveur. Or `ssr: false` est refusé dans un composant serveur —
// d'où cette enveloppe, qui n'existe que pour porter cette option et laisser
// la page rester un composant serveur.
//
// Effet secondaire heureux : les 250 ko de Leaflet ne sont téléchargés que
// lorsque la carte est réellement affichée.
const Carte = dynamic(
  () => import("@/components/belgium-schools-map").then((m) => m.BelgiumSchoolsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-xl border border-stone-200 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        Chargement de la carte…
      </div>
    ),
  }
);

export function BelgiumSchoolsMapLoader({ schools }: { schools: SchoolPoint[] }) {
  return <Carte schools={schools} />;
}
