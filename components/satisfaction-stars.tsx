"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { setSatisfactionRating } from "@/app/(app)/actions";
import { ShareButtons } from "@/components/share-buttons";

// Étoile pleine si son rang <= note ; dégradé bleu → sarcelle (couleurs du
// logo) partagé via un <linearGradient> défini une fois. Note non définitive
// : recliquer à tout moment change d'avis (pas de confirmation nécessaire).
export function SatisfactionStars({ initialRating }: { initialRating: number | null }) {
  const gradientId = useId();
  const [rating, setRating] = useState(initialRating ?? 0);
  const [showLowRatingModal, setShowLowRatingModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [, startTransition] = useTransition();

  // Deux réactions symétriques, au moment précis où l'avis vient d'être
  // exprimé : le mécontent est invité à dire ce qui ne va pas, le satisfait à
  // en parler autour de lui. Ailleurs qu'ici, un bouton « partager » serait un
  // ornement que personne ne remarque ; ici, il tombe sur quelqu'un qui vient
  // tout juste de déclarer sa satisfaction.
  //
  // La note de 3 ne déclenche rien : ni assez mauvaise pour alerter, ni assez
  // bonne pour qu'on demande à cette personne de nous recommander.
  function handleClick(value: number) {
    setRating(value);
    startTransition(() => {
      setSatisfactionRating(value);
    });
    if (value <= 2) setShowLowRatingModal(true);
    else if (value >= 4) setShowShareModal(true);
  }

  return (
    <div>
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-600)" />
            <stop offset="100%" stopColor="var(--color-brand-teal)" />
          </linearGradient>
        </defs>
      </svg>

      <p className="mb-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">Votre avis nous intéresse</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            aria-label={`${value} étoile${value > 1 ? "s" : ""} sur 5`}
            aria-pressed={value <= rating}
            className="p-0.5 transition hover:scale-110"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill={value <= rating ? `url(#${gradientId})` : "none"}
              stroke={value <= rating ? "none" : "currentColor"}
              strokeWidth={1.5}
            >
              <path
                strokeLinejoin="round"
                d="M12 2.5l2.9 6.2 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7z"
                className={value <= rating ? "" : "text-stone-300 dark:text-stone-600"}
              />
            </svg>
          </button>
        ))}
      </div>

      {showShareModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 px-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-xl dark:border-stone-800 dark:bg-stone-900"
          >
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Merci pour votre avis
            </h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              La plateforme se fait connaître de bouche à oreille. Un mot de votre part à des
              collègues d&apos;une autre école vaut plus que n&apos;importe quelle publicité.
            </p>
            {/* Taille pleine, et non `compact` : ce sont les seuls boutons
                d'action de cette fenêtre, et 44 px est le minimum confortable
                pour une cible tactile. */}
            <div className="mt-5">
              <ShareButtons />
            </div>
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="btn-secondary mt-5 w-full"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showLowRatingModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 px-4"
          onClick={() => setShowLowRatingModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-xl dark:border-stone-800 dark:bg-stone-900"
          >
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Désolé de cette expérience
            </h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Dites-nous ce qui ne va pas : un ticket d&apos;assistance nous permet de comprendre et de
              corriger le problème.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/assistance"
                onClick={() => setShowLowRatingModal(false)}
                className="btn-primary"
              >
                Contacter l&apos;assistance
              </Link>
              <button
                type="button"
                onClick={() => setShowLowRatingModal(false)}
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
