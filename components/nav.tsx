"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import type { ActiveMembership } from "@/lib/active-school";
import { SchoolMenu } from "@/components/school-menu";
import { AccountMenu } from "@/components/account-menu";
import { SatisfactionStars } from "@/components/satisfaction-stars";
import { SchoolYearBadge } from "@/components/school-year-badge";
import {
  IconAssistance,
  IconDeclarer,
  IconEcole,
  IconJournal,
  IconParametres,
  IconPeriodes,
  IconPlateforme,
  IconTableauDeBord,
} from "@/components/nav-icons";

// Le menu regroupe désormais toute la navigation, y compris les onglets qui
// surmontaient l'espace direction : les garder en barre horizontale les aurait
// dupliqués. Trois sections, dans l'ordre où l'on s'en sert — ce qu'on fait
// pour soi, ce qu'on pilote pour son école, le reste.
type NavEntry = { href: string; label: string; Icon: ComponentType<{ className?: string }> };
type NavSection = { titre: string; entries: NavEntry[] };

const linkBase =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition";
const linkIdle =
  "text-stone-600 hover:bg-brand-50 hover:text-brand-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-brand-400";
// L'entrée courante est repérée par un fond plein plutôt qu'un simple gras :
// le tiroir se lit d'un coup d'œil, sans chercher la nuance de graisse.
const linkActive =
  "bg-brand-600 text-white shadow-sm shadow-brand-600/20 dark:bg-brand-600 dark:text-white";

export function Nav({
  session,
  active,
  memberships,
  satisfactionRating,
  schoolYearLabel,
}: {
  session: Session;
  active: ActiveMembership | null;
  memberships: ActiveMembership[];
  satisfactionRating: number | null;
  /// Libellé de l'année scolaire courante, null si aucune n'est ouverte.
  schoolYearLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Distingue "jamais encore ouvert" de "en train de se refermer" : sans ça,
  // le premier rendu (open=false) jouerait à tort l'animation de fondu de
  // fermeture dès le chargement de la page.
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const initial = session.user?.name?.trim().charAt(0).toUpperCase() ?? "?";

  // Trois fermetures : le bouton X, un clic dans la page (le rideau), et le
  // choix d'une destination dans le tiroir — on ne reste pas devant un menu
  // ouvert sur la page qu'on vient d'atteindre.
  //
  // Seuls les éléments qui MÈNENT quelque part referment : les étoiles de
  // satisfaction, elles, se cliquent sur place et refermer le tiroir sous les
  // doigts donnerait l'impression d'avoir raté sa cible.
  function handleOpenChange(next: boolean) {
    if (next) setHasOpenedOnce(true);
    setOpen(next);
  }

  const fermer = () => handleOpenChange(false);

  const pathname = usePathname();
  const peutGererEcole = active?.role === "DIRECTION" || active?.role === "REFERENT_NUMERIQUE";

  // Exact pour les racines, préfixe pour les sous-pages : sans ça, /ecole
  // resterait allumé en consultant /ecole/parametres, et deux entrées
  // paraîtraient actives en même temps.
  const estActif = (href: string) =>
    href === "/ecole" || href === "/mes-periodes"
      ? pathname === href
      : pathname === href || pathname?.startsWith(`${href}/`);

  const sections: NavSection[] = [
    ...(active
      ? [
          {
            titre: "Mon espace",
            entries: [
              { href: "/mes-periodes", label: "Mes périodes", Icon: IconPeriodes },
              { href: "/declarer", label: "Déclarer une période", Icon: IconDeclarer },
            ],
          },
        ]
      : []),
    ...(active && peutGererEcole
      ? [
          {
            titre: "Mon école",
            entries: [
              { href: "/ecole", label: "Tableau de bord", Icon: IconTableauDeBord },
              { href: "/ecole/parametres", label: "Paramètres", Icon: IconParametres },
              { href: "/ecole/audit", label: "Journal", Icon: IconJournal },
            ],
          },
        ]
      : []),
    {
      titre: "Autres",
      entries: [
        { href: "/rejoindre-ecole", label: "Rejoindre une école", Icon: IconEcole },
        { href: "/assistance", label: "Assistance", Icon: IconAssistance },
      ],
    },
    // L'administration de la plateforme n'est pas « autre chose » : c'est un
    // univers séparé, qui ne concerne qu'une poignée de comptes. Sa propre
    // section l'empêche de se noyer entre l'assistance et le rattachement.
    ...(session.isSuperAdmin
      ? [
          {
            titre: "Plateforme",
            entries: [{ href: "/admin", label: "Administration", Icon: IconPlateforme }],
          },
        ]
      : []),
  ];

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
      {/* Ouvert, le bouton glisse hors du tiroir (240px de large) pour se poser
          sur le rideau, à sa droite : l'entête est alors libre de tout obstacle
          et le logo peut s'y centrer à pleine taille. Le déplacement dure
          autant que celui du panneau, les deux avancent ensemble. */}
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className={`fixed top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-teal text-white shadow-lg transition-all duration-300 hover:brightness-105 ${
          open ? "left-[16rem]" : "left-4"
        }`}
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

      {/* Deux contrôles posés en PERMANENCE dans la barre, hors du tiroir.
          Celui-ci est fermé par défaut : tant qu'il l'est, ni l'école active,
          ni le profil, ni la déconnexion n'étaient atteignables sans l'ouvrir.

          Le sélecteur d'école s'efface pendant que le tiroir est ouvert. Il
          se poserait sinon PAR-DESSUS le panneau — z-50 contre z-40 — en
          plein milieu de la navigation. La pastille de compte, elle, reste :
          à droite de l'écran, elle ne rencontre jamais le tiroir. */}
      {active && !open && (
        <div className="fixed left-16 top-4 z-50">
          <SchoolMenu active={active} memberships={memberships} />
        </div>
      )}

      {/* Le bouton de thème occupe `top-4` sur 36 px de haut (cf.
          components/theme-toggle.tsx) : `top-16` se pose juste dessous. */}
      <div className="fixed right-4 top-16 z-50">
        <AccountMenu
          name={session.user?.name ?? "Mon compte"}
          email={session.user?.email ?? null}
          initial={initial}
        />
      </div>

      {/* Toujours monté (contrairement à un simple `{open && ...}`) pour
          pouvoir animer la sortie, pas seulement l'entrée : apparition et
          disparition en fondu (animation à keyframes fixes, cf. globals.css
          — pas une `transition-opacity`, peu fiable ici avec les nuages
          enfants qui arrêtent leur propre animation au même instant).
          Pendant l'ouverture, les nuages grossissent en boucle vers la vue
          (effet "pare-brise d'avion").

          Le flou porte sur le fond (`backdrop-blur`) et non sur la page
          elle-même : ses animations continuent de tourner derrière, mais le
          contenu cesse de disputer l'attention au menu. Les nuages sont des
          enfants du rideau, donc peints PAR-DESSUS ce flou — ils restent
          nets et animés. Le voile se teinte selon le thème : blanc sur fond
          clair, ardoise sur fond sombre, où un voile blanc éclaircirait la
          page au lieu de l'estomper. */}
      <div
        onClick={() => handleOpenChange(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-30 overflow-hidden backdrop-blur-[6px] ${
          curtainState === "closed"
            ? "opacity-0 pointer-events-none"
            : curtainState === "opening"
              ? "opacity-100 pointer-events-auto animate-curtain-fade-in"
              : "opacity-0 pointer-events-none animate-curtain-fade-out"
        }`}
      >
        <div className="absolute inset-0 bg-white/40 dark:bg-stone-950/50" />
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
        className={`fixed left-0 top-0 z-40 flex h-screen w-60 shrink-0 flex-col justify-between overflow-hidden border [height:100dvh] bg-white text-stone-700 transition-transform duration-300 dark:bg-stone-900 dark:text-stone-300 [border-image:linear-gradient(160deg,rgb(46_134_222_/_0.35),rgb(20_184_166_/_0.35))_1] ${
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

        {/* `min-h-0` est indispensable : sans lui, un enfant flex refuse de
            passer sous la hauteur de son contenu, le pied du tiroir est
            repoussé hors de l'écran et « Déconnexion » disparaît sous
            l'`overflow-hidden` de l'aside. Ici le haut défile, le pied reste. */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pt-2">
          <Link
            href="/mes-periodes"
            className="flex items-center justify-center px-5 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LogoTCvertical.png" alt="Travail Collaboratif" className="h-[60px] w-auto object-contain" />
          </Link>
          <div className="border-t border-stone-200 px-5 py-2.5 text-left dark:border-stone-800">
            {/* Pas de soulignement : ce n'est pas un lien, et le laisser
                souligné promettait un clic qui n'arrivait jamais. */}
            {active && (
              <span className="block truncate text-sm font-bold text-stone-700 dark:text-stone-200">
                {active.schoolName}
              </span>
            )}
            <div className={active ? "mt-2" : ""}>
              <SchoolYearBadge
                label={schoolYearLabel}
                adminLink={session.isSuperAdmin}
              />
            </div>
          </div>
          <nav className="mt-2 space-y-4 px-3">
            {sections.map((section) => (
              <div key={section.titre}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  {section.titre}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.entries.map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={fermer}
                      aria-current={estActif(href) ? "page" : undefined}
                      className={`${linkBase} ${estActif(href) ? linkActive : linkIdle}`}
                    >
                      <Icon />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Le tiroir ne fait plus QUE de la navigation. L'identité (nom,
            profil, déconnexion) et le contexte d'école ont rejoint la barre
            du haut, où ils sont lisibles sans rien ouvrir — cf.
            components/account-menu.tsx et components/school-menu.tsx. Les
            garder ici aussi aurait donné deux chemins pour le même geste,
            dont l'un enterré derrière une ouverture de tiroir.

            Ne reste que l'appréciation, qui n'est ni une destination ni une
            identité : sa place est bien en pied.

            La marge basse revient du coup à la normale. Ses 3,5 rem
            supplémentaires ne servaient qu'à hisser « Déconnexion » au-dessus
            de la barre des tâches de Windows, qui mord sur la zone rendue ;
            plus rien d'indispensable ne s'y trouve. Seule l'encoche des
            téléphones reste à compenser. `100dvh` sur l'aside complète la
            parade : sur mobile, `h-screen` compte la barre d'adresse qui se
            rétracte, donc une hauteur supérieure à l'écran réel. */}
        <div className="relative z-10 shrink-0 border-t border-stone-200 bg-white/70 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/70">
          <SatisfactionStars initialRating={satisfactionRating} />
        </div>
      </aside>
    </>
  );
}
