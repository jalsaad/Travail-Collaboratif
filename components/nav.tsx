"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import type { ActiveMembership } from "@/lib/active-school";
import { SchoolSwitcher } from "@/components/school-switcher";
import { SatisfactionStars } from "@/components/satisfaction-stars";
import { signOutAction } from "@/app/(app)/actions";

const linkClass =
  "block rounded-lg px-3 py-2 text-sm text-stone-600 transition hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-400";

export function Nav({
  session,
  active,
  memberships,
  satisfactionRating,
}: {
  session: Session;
  active: ActiveMembership | null;
  memberships: ActiveMembership[];
  satisfactionRating: number | null;
}) {
  const [open, setOpen] = useState(false);
  // Distingue "jamais encore ouvert" de "en train de se refermer" : sans ça,
  // le premier rendu (open=false) jouerait à tort l'animation de fondu de
  // fermeture dès le chargement de la page.
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const initial = session.user?.name?.trim().charAt(0).toUpperCase() ?? "?";

  function handleOpenChange(next: boolean) {
    if (next) setHasOpenedOnce(true);
    setOpen(next);
  }

  const curtainState = !hasOpenedOnce ? "closed" : open ? "opening" : "closing";

  // À la fermeture, on NE retire PAS la classe d'animation du nuage (ce qui
  // le ferait sauter instantanément à son état "hors animation" — taille et
  // opacité par défaut — avant même que le fondu du rideau ne commence). On
  // met plutôt l'animation en pause via `animation-play-state`, ce qui la
  // fige exactement là où elle en était (même taille, même opacité) : le
  // nuage reste "à sa place" pendant que le rideau parent se fond vers 0.
  // Passe par un style inline plutôt qu'une classe Tailwind `[animation-
  // play-state:paused]` : les utilitaires générés par Tailwind v4 vivent
  // dans un cascade layer, systématiquement perdant face à `.animate-cloud-
  // fly-*` (règle "brute", hors layer, dans globals.css) qui utilise le
  // raccourci `animation` — celui-ci réinitialise implicitement `animation-
  // play-state` à `running`, quel que soit l'ordre des règles. Un style
  // inline gagne dans tous les cas.
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

      {/* Toujours monté (contrairement à un simple `{open && ...}`) pour
          pouvoir animer la sortie, pas seulement l'entrée : apparition et
          disparition en fondu (animation à keyframes fixes, cf. globals.css
          — pas une `transition-opacity`, peu fiable ici avec les nuages
          enfants qui arrêtent leur propre animation au même instant).
          Pendant l'ouverture, les nuages grossissent en boucle vers la vue
          (effet "pare-brise d'avion"). Assez translucide pour laisser
          deviner le contenu de la page derrière. */}
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
        <div
          className={`absolute left-[32%] top-[72%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl ${cloudFlyClass("animate-cloud-fly-b")}`}
          style={cloudStyle}
        />
        <div
          className={`absolute left-[82%] top-[22%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-teal/20 blur-3xl ${cloudFlyClass("animate-cloud-fly-a")}`}
          style={cloudStyle}
        />
      </div>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-60 shrink-0 flex-col justify-between overflow-hidden border bg-white text-stone-700 transition-transform duration-300 dark:bg-stone-900 dark:text-stone-300 [border-image:linear-gradient(160deg,rgb(46_134_222_/_0.35),rgb(20_184_166_/_0.35))_1] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Même décor que le héro du sas de connexion (cf. app/(auth)/login) :
            grille de points + halos dégradés aux couleurs du logo, qui
            dérivent doucement (respecte prefers-reduced-motion). */}
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-12 -left-12 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl animate-drift-a" />
        <div className="pointer-events-none absolute -bottom-12 -right-16 h-56 w-56 rounded-full bg-brand-teal/20 blur-3xl animate-drift-b" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-600/15 to-brand-teal/15 blur-3xl animate-drift-c" />

        <div className="relative z-10 pt-16">
          <Link href="/mes-periodes" onClick={() => handleOpenChange(false)} className="flex items-center px-5 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LogoTCvertical.png" alt="Travail Collaboratif" className="h-[60px] w-auto object-contain" />
          </Link>
          {active && (
            <div className="border-t border-stone-200 px-5 py-3 text-left dark:border-stone-800">
              <span className="block truncate text-sm font-bold text-stone-700 underline dark:text-stone-200">{active.schoolName}</span>
            </div>
          )}
          <nav className="mt-2 flex flex-col gap-0.5 px-3">
            {active && (
              <>
                <Link href="/mes-periodes" onClick={() => handleOpenChange(false)} className={linkClass}>
                  Mes périodes
                </Link>
                <Link href="/declarer" onClick={() => handleOpenChange(false)} className={linkClass}>
                  Déclarer
                </Link>
                {(active.role === "DIRECTION" || active.role === "REFERENT_NUMERIQUE") && (
                  <Link href="/ecole" onClick={() => handleOpenChange(false)} className={linkClass}>
                    École
                  </Link>
                )}
              </>
            )}
            <Link href="/rejoindre-ecole" onClick={() => handleOpenChange(false)} className={linkClass}>
              Rejoindre une école
            </Link>
            <Link href="/assistance" onClick={() => handleOpenChange(false)} className={linkClass}>
              Assistance
            </Link>
            {session.isSuperAdmin && (
              <Link href="/admin" onClick={() => handleOpenChange(false)} className={linkClass}>
                Plateforme
              </Link>
            )}
          </nav>
        </div>

        <div className="relative z-10 space-y-3 border-t border-stone-200 bg-white/70 px-3 py-4 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/70">
          {active && memberships.length > 1 && (
            <SchoolSwitcher memberships={memberships} activeSchoolId={active.schoolId} />
          )}
          <Link
            href="/mon-profil"
            onClick={() => handleOpenChange(false)}
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm transition hover:bg-brand-50 dark:hover:bg-stone-800"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-teal text-xs font-semibold text-white">
              {initial}
            </span>
            <span className="truncate text-stone-700 dark:text-stone-300">{session.user?.name}</span>
          </Link>
          <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
            <SatisfactionStars initialRating={satisfactionRating} />
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
