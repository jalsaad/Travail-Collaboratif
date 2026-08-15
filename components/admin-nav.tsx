"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { signOutAction } from "@/app/(app)/actions";
import { SchoolYearBadge } from "@/components/school-year-badge";

// Menu de l'administration plateforme, calqué sur celui des espaces Profs et
// Direction (cf. components/nav.tsx) : même bouton hamburger, même rideau
// animé, même tiroir latéral. Les onglets qui occupaient une barre fixe en
// haut de page y sont désormais rangés.
//
// Volontairement sans lien « Mon espace » : l'administration plateforme est
// transverse, son titulaire n'a pas à être rattaché à une école. Le chemin
// inverse existe toujours, l'espace Profs proposant « Plateforme » aux
// superadmins.

const linkClass =
  "block rounded-lg px-3 py-2 text-sm text-stone-600 transition hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-400";

export type AdminNavTab = { href: string; label: string };

export function AdminNav({
  session,
  tabs,
  openTicketsCount,
  schoolYearLabel,
}: {
  session: Session;
  tabs: AdminNavTab[];
  openTicketsCount: number;
  /// Libellé de l'année scolaire courante, null si aucune n'est ouverte.
  schoolYearLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Distingue "jamais encore ouvert" de "en train de se refermer", sans quoi
  // le premier rendu jouerait l'animation de fermeture au chargement.
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const initial = session.user?.name?.trim().charAt(0).toUpperCase() ?? "?";

  function handleOpenChange(next: boolean) {
    if (next) setHasOpenedOnce(true);
    setOpen(next);
  }

  const curtainState = !hasOpenedOnce ? "closed" : open ? "opening" : "closing";
  const cloudFlyClass = (flyClass: string) => (hasOpenedOnce ? flyClass : "");
  const cloudStyle = hasOpenedOnce && !open ? { animationPlayState: "paused" as const } : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-teal text-white shadow-lg transition hover:brightness-105"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Toujours monté pour pouvoir animer la sortie, pas seulement l'entrée
          — cf. le commentaire détaillé dans components/nav.tsx. */}
      <div
        onClick={() => handleOpenChange(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-30 overflow-hidden ${
          curtainState === "closed"
            ? "opacity-0 pointer-events-none"
            : curtainState === "opening"
              ? "opacity-100 pointer-events-auto animate-curtain-fade-in"
              : "opacity-0 pointer-events-none animate-curtain-fade-out"
        }`}
      >
        <div className="absolute inset-0 bg-white/10" />
        <div
          className={`absolute left-[22%] top-[28%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/30 blur-3xl ${cloudFlyClass("animate-cloud-fly-a")}`}
          style={cloudStyle}
        />
        <div
          className={`absolute left-[72%] top-[55%] h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-teal/25 blur-3xl ${cloudFlyClass("animate-cloud-fly-b")}`}
          style={cloudStyle}
        />
        <div
          className={`absolute left-[45%] top-[18%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-600/25 to-brand-teal/25 blur-3xl ${cloudFlyClass("animate-cloud-fly-c")}`}
          style={cloudStyle}
        />
      </div>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-60 shrink-0 flex-col justify-between overflow-hidden border bg-white text-stone-700 transition-transform duration-300 dark:bg-stone-900 dark:text-stone-300 [border-image:linear-gradient(160deg,rgb(46_134_222_/_0.35),rgb(20_184_166_/_0.35))_1] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-12 -left-12 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl animate-drift-a" />
        <div className="pointer-events-none absolute -bottom-12 -right-16 h-56 w-56 rounded-full bg-brand-teal/20 blur-3xl animate-drift-b" />

        {/* Même ossature que components/nav.tsx : le haut défile (`min-h-0`,
            sans quoi le pied serait repoussé hors écran et « Déconnexion »
            rognée), le pied reste ancré, le logo se range à droite du bouton
            hamburger pour remonter en haut du tiroir. */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pt-2">
          <Link
            href="/admin"
            onClick={() => handleOpenChange(false)}
            className="flex items-center py-2 pl-14 pr-2"
          >
            {/* Hauteur calée sur la largeur disponible, pas choisie à l'œil :
                tiroir 240px moins les 56px occupés par le bouton hamburger et
                une gouttière, soit 174px — le logo étant au ratio 3:1 (900×300),
                58px de haut le remplissent sans le rétrécir ni le tronquer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LogoTCvertical.png" alt="Travail Collaboratif" className="h-[58px] w-auto object-contain" />
          </Link>
          <div className="border-t border-stone-200 px-5 py-2.5 text-left dark:border-stone-800">
            <span className="block truncate text-sm font-bold text-stone-700 dark:text-stone-200">
              Administration plateforme
            </span>
            <div className="mt-2">
              <SchoolYearBadge
                label={schoolYearLabel}
                adminLink
                onNavigate={() => handleOpenChange(false)}
              />
            </div>
          </div>
          <nav className="mt-2 flex flex-col gap-0.5 px-3">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => handleOpenChange(false)}
                className={linkClass}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {/* Nombre de tickets encore "Ouvert" (cf. /admin/assistance) — masqué à 0 */}
                  {tab.href === "/admin/assistance" && openTicketsCount > 0 && (
                    <sup className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                      {openTicketsCount}
                    </sup>
                  )}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="relative z-10 shrink-0 space-y-2.5 border-t border-stone-200 bg-white/70 px-3 py-3 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/70">
          <div className="flex items-center gap-2 px-1 py-1 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-teal text-xs font-semibold text-white">
              {initial}
            </span>
            <span className="truncate text-stone-700 dark:text-stone-300">{session.user?.name}</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-red-50 hover:text-red-700 dark:text-stone-400 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
