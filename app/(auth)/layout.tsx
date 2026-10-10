import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

/// Habillage des pages publiques : connexion, inscription d'école,
/// rattachement par lien, politique de confidentialité, désabonnement.
///
/// Elles n'ont pas de menu de compte — personne n'y est connecté — donc la
/// bascule de thème y reste un bouton flottant dans le coin. Dans l'espace
/// enseignant, elle a rejoint le menu de la pastille (cf.
/// components/account-menu.tsx) pour ne plus occuper deux contrôles côte à
/// côte.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ThemeToggle />
    </>
  );
}
