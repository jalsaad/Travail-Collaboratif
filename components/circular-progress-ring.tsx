"use client";

import { useEffect, useState } from "react";

// Un anneau complet par tranche de 100% (façon anneaux de montre connectée) :
// au-delà de 100%, chaque tranche supplémentaire ajoute un anneau vers
// l'extérieur, le dernier (potentiellement partiel) étant le plus grand.
const RING_PALETTE = ["#1a5aa0", "#2e86de", "#14b8a6", "#5eead4", "#93c5fd"];

export function CircularProgressRing({
  percent,
  size = 140,
  strokeWidth = 10,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [displayPercent, setDisplayPercent] = useState(0);
  const target = Math.max(0, percent);

  useEffect(() => {
    const revealFrame = requestAnimationFrame(() => setMounted(true));

    const durationMs = 900;
    const start = performance.now();
    let tickFrame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplayPercent(target * progress);
      if (progress < 1) tickFrame = requestAnimationFrame(tick);
    };
    tickFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(revealFrame);
      cancelAnimationFrame(tickFrame);
    };
  }, [target]);

  const maxRadius = size / 2 - strokeWidth / 2;
  const gap = strokeWidth + 3;
  const laps = target > 0 ? Math.ceil(target / 100) : 0;
  const remainder = target % 100;

  const rings = Array.from({ length: laps }, (_, i) => {
    const radius = maxRadius - (laps - 1 - i) * gap;
    const isLast = i === laps - 1;
    const fraction = isLast ? (remainder === 0 ? 1 : remainder / 100) : 1;
    const circumference = 2 * Math.PI * radius;
    return { radius, circumference, fraction, color: RING_PALETTE[i % RING_PALETTE.length] };
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={maxRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-stone-200 dark:text-stone-700"
        />
        {rings.map((ring, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={ring.radius}
            fill="none"
            stroke={ring.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={ring.circumference}
            strokeDashoffset={mounted ? ring.circumference * (1 - ring.fraction) : ring.circumference}
            className="transition-[stroke-dashoffset] duration-[900ms] ease-out"
          />
        ))}
      </svg>
      <span
        className="absolute font-semibold text-stone-900 dark:text-stone-100"
        style={{ fontSize: size * 0.18 }}
      >
        {Math.round(displayPercent)}%
      </span>
    </div>
  );
}
