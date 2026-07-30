"use client";

import { useEffect, useState } from "react";

// Compte de 0 jusqu'à la valeur cible à l'affichage — même logique
// d'animation que components/circular-progress-ring.tsx (requestAnimationFrame,
// pas de dépendance à une librairie d'animation).
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(value * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}
