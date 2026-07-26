"use client";

import { useState } from "react";
import Image from "next/image";

export function AboutUsSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-16 border-t border-stone-200 pt-6 text-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-brand-700"
      >
        À propos de nous
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          open ? "mt-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto max-w-md pb-2">
            <Image
              src="/TC3d.png"
              alt="Travail Collaboratif"
              width={900}
              height={300}
              className="mx-auto h-auto w-[83px]"
            />
            <p className="mt-4 text-sm font-semibold text-stone-800">
              Conçue par des enseignant·es, pour des enseignant·es.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Ouverte à tous les collègues de Wallonie — tous réseaux, tous niveaux, de la
              maternelle au secondaire.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Notre mission : simplifier la gestion de vos heures de travail collaboratif, une
              bonne fois pour toutes.
            </p>
            <p className="mt-3 text-sm font-medium text-brand-700">
              100% gratuite, sans limite. Utilisez-la, partagez-la, faites-en profiter vos
              collègues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
