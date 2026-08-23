"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Révèle son contenu (fondu + léger déplacement vers le haut) dès qu'il entre
// dans le viewport au défilement — jamais avant, jamais après un premier
// passage (l'observateur se déconnecte une fois déclenché, pas de
// clignotement si l'utilisateur remonte/redescend la page).
//
// Le seuil est en pixels, pas en pourcentage, et c'est essentiel : un seuil de
// 15 % rapporte la surface VISIBLE à la surface TOTALE de l'élément. Un
// tableau plus haut que l'écran ne peut alors jamais l'atteindre — 15 % de
// 4 000 pixels en font 600, davantage que ce qu'affiche un écran d'ordinateur
// portable une fois retirées les barres du navigateur. Le contenu restait donc
// invisible pour toujours, sans la moindre erreur : il était bien dans la page,
// à `opacity: 0`.
//
// C'est ainsi qu'une liste de cinquante écoles disparaissait là où une liste de
// onze s'affichait normalement.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Seuil à zéro : le moindre pixel visible suffit. La marge négative en bas
      // retarde le déclenchement de quarante pixels, de quoi éviter qu'un
      // élément affleurant le bord ne s'anime avant d'être vraiment lu.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
