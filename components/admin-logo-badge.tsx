"use client";

import { usePathname } from "next/navigation";
import { SchoolLogoBadge } from "@/components/school-logo-badge";

/// Fiche d'une école précise : /admin/ecoles/<id>, et elle seule — ni la
/// liste `/admin/ecoles`, ni une éventuelle sous-page.
const FICHE_ECOLE = /^\/admin\/ecoles\/[^/]+$/;

/// Blason de l'espace plateforme, qui s'efface sur la fiche d'une école.
///
/// Le layout admin ne connaît pas l'école affichée : les paramètres de route
/// d'un segment plus profond ne lui parviennent pas. Il montrerait donc le
/// logo générique par-dessus celui de l'école. Plutôt que d'ajouter un
/// middleware pour lui transmettre le chemin, on laisse ce composant client
/// lire l'adresse et céder la place : c'est la PAGE qui monte alors le
/// blason, avec le logo de CETTE école.
///
/// `usePathname` est renseigné dès le rendu serveur du composant client :
/// aucun clignotement entre les deux états.
export function AdminLogoBadge() {
  const pathname = usePathname();
  if (FICHE_ECOLE.test(pathname)) return null;

  return (
    <>
      <SchoolLogoBadge />
      <p className="mt-1 text-center text-sm font-semibold text-stone-500 dark:text-stone-400">
        Administration plateforme
      </p>
    </>
  );
}
