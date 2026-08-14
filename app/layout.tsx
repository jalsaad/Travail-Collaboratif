import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { OfferedByBadge } from "@/components/offered-by-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Travail Collaboratif",
  description: "Gestion du travail collaboratif enseignant — circulaires 7167 et 8894 (Fédération Wallonie-Bruxelles)",
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
        {children}
        <OfferedByBadge />
        <ThemeToggle />
      </body>
    </html>
  );
}
