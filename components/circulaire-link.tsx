import type { ReactNode } from "react";
import { CIRCULAIRE_7167_URL, CIRCULAIRE_8894_URL } from "@/lib/regulatory-reference";

const URLS = {
  "7167": CIRCULAIRE_7167_URL,
  "8894": CIRCULAIRE_8894_URL,
} as const;

// Lien vers le texte officiel (Gallilex) d'une des deux circulaires citées
// dans l'app — pas de `use client` : un simple <a>, sans état ni handler.
export function CirculaireLink({ numero, children }: { numero: keyof typeof URLS; children?: ReactNode }) {
  return (
    <a
      href={URLS[numero]}
      target="_blank"
      rel="noopener"
      className="underline decoration-dotted underline-offset-2 hover:text-brand-700 dark:hover:text-brand-400"
    >
      {children ?? numero}
    </a>
  );
}
