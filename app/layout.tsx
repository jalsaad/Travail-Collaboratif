import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { OfferedByBadge } from "@/components/offered-by-badge";
import { PUBLIC_SITE_URL } from "@/lib/public-url";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const DESCRIPTION =
  "Gestion du travail collaboratif enseignant — circulaires 7167 et 8894 (Fédération Wallonie-Bruxelles)";

// MÉTADONNÉES DE PARTAGE. Facebook et LinkedIn ignorent tout texte
// pré-rempli — leur politique l'interdit depuis 2017 : la personne écrit son
// propre mot, et la vignette est composée À PARTIR D'ICI. Sans ces balises,
// un partage ne produisait qu'un rectangle gris portant une URL, c'est-à-dire
// le contraire de ce que les boutons de partage cherchent à obtenir (cf.
// components/share-buttons.tsx).
//
// `metadataBase` est indispensable : sans elle, Next émet les chemins
// d'images en relatif, que les robots de Facebook et LinkedIn ne savent pas
// résoudre. Elle pointe le site public, jamais l'hôte de la requête.
export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: "Travail Collaboratif",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "Travail Collaboratif",
    title: "Travail Collaboratif — vos 60 périodes, sans tableur",
    description: DESCRIPTION,
    url: "/",
    images: [
      {
        // 1200x630, le format attendu par Facebook, LinkedIn et X. Le logo
        // seul y aurait été encadré de bandes : cette vignette est composée
        // pour ce cadre précis (cf. scripts/generer-og-card.ts, à relancer
        // si le texte change).
        url: "/og-card.png",
        width: 1200,
        height: 630,
        alt: "Travail Collaboratif — vos 60 périodes, sans tableur",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Travail Collaboratif — vos 60 périodes, sans tableur",
    description: DESCRIPTION,
    images: ["/og-card.png"],
  },
};

// Pose la classe `.dark` sur <html> avant tout rendu/peinture — évite le
// flash d'un thème incorrect (contenu clair affiché une frame avant de
// basculer sombre). Doit rester un <script> synchrone exécuté au plus tôt,
// pas un effet React (qui ne tournerait qu'après l'hydratation).
const noFlashScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="bg-stone-50 font-sans text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
        {/* La bascule de thème n'est PLUS montée ici. Chaque espace déclare
            désormais la sienne : bouton flottant sur les pages publiques
            (app/(auth)/layout.tsx) et dans l'espace plateforme
            (app/admin/layout.tsx), ligne du menu de compte dans l'espace
            enseignant (components/account-menu.tsx). Un bouton global aurait
            fallu le masquer à partir d'une liste de chemins, qui aurait
            vieilli à la première route ajoutée. */}
        {children}
        <OfferedByBadge />
      </body>
    </html>
  );
}
