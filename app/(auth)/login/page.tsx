import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { CirculaireLink } from "@/components/circulaire-link";
import { AboutUsSection } from "@/components/about-us-section";
import { ReseauxEnseignementSection } from "@/components/reseaux-enseignement-section";
import { SatisfactionSummary } from "@/components/satisfaction-summary";
import { getPublicSatisfaction } from "@/lib/satisfaction";

// La page lit la moyenne des avis en base : elle ne peut donc plus être
// figée au build, qui n'a pas forcément accès à la base de données. Le coût
// est d'une agrégation sur une table de quelques dizaines de lignes — moins
// cher que n'importe laquelle des images de cette page.
export const dynamic = "force-dynamic";

export default async function LoginGatewayPage() {
  const satisfaction = await getPublicSatisfaction();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-white to-teal-50/60 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950">
      {/* Arrière-plan décoratif — purement esthétique, aucun impact sur le
          contenu : grille de points estompée + halos dégradés qui dérivent
          doucement (respecte prefers-reduced-motion, cf. globals.css). */}
      <div className="hero-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl animate-drift-a" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-teal/20 blur-3xl animate-drift-b" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-200/25 to-teal-200/25 blur-3xl animate-drift-c" />

      {/* Marge haute calée sur le bouton de thème (fixe à `top-4`, soit 16px) :
          le sommet visible du logo doit arriver à sa hauteur. Le fichier porte
          7,7% de transparence au-dessus du dessin — 5px à la taille rendue —
          d'où 10px de padding et non 16. */}
      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-2.5 sm:pb-20">
        <Reveal className="text-center">
          <Image
            src="/LogoTCvertical.png"
            alt="Travail Collaboratif"
            width={900}
            height={300}
            priority
            className="mx-auto h-auto w-48 sm:w-56"
          />

          <span className="mt-8 inline-flex items-center rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-stone-800 dark:text-brand-400 dark:ring-stone-700">
            Plateforme 100% gratuite
          </span>

          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
            Bienvenue dans votre espace de création et de partage de tâches collaboratives
          </h1>

          {/* Reprend le libellé de lib/regulatory-reference.ts::CONFORMITY_MENTION
              (gardé identique pour les PDF/affiches générés côté serveur, où
              un lien n'a pas de sens) — ici en JSX pour rendre 7167 et 8894
              cliquables vers leur texte officiel (Gallilex). */}
          <p className="mx-auto mt-4 max-w-xl text-sm text-stone-600 dark:text-stone-300">
            Déclaration de travail collaboratif en conformité avec les circulaires{" "}
            <CirculaireLink numero="7167" /> et <CirculaireLink numero="8894" /> de la Fédération
            Wallonie-Bruxelles.
          </p>



        <Reveal className="mt-14 text-center text-sm font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
          Choisissez votre espace
        </Reveal>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
           <Reveal delay={120} className="group relative isolate w-full max-w-[240px] sm:max-w-[260px]">
            {/* Halo aux couleurs du logo (bleu → sarcelle) qui déborde
                autour de la carte, comme une source lumineuse cachée
                derrière celle-ci — la carte (opaque) masque le centre du
                halo, seul le débordement flou reste visible sur les bords. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
            />
            <Link
              href="/login/profs"
              className="relative block overflow-hidden rounded-2xl border-2 border-brand-teal/50 transition hover:-translate-y-1 dark:border-brand-400/50"
            >
              <Image
                src="/EspaceProfsLight.png"
                alt="Espace Profs"
                width={500}
                height={500}
                priority
                className="block h-auto w-full dark:hidden"
              />
              <Image
                src="/EspaceProfsDark.png"
                alt="Espace Profs"
                width={500}
                height={500}
                priority
                className="hidden h-auto w-full dark:block"
              />
            </Link>
          </Reveal>
          <Reveal delay={0} className="group relative isolate w-full max-w-[240px] sm:max-w-[260px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
            />
            <Link
              href="/login/direction"
              className="relative block overflow-hidden rounded-2xl border-2 border-brand-teal/50 transition hover:-translate-y-1 dark:border-brand-400/50"
            >
              <Image
                src="/EspaceDirectionLight.png"
                alt="Espace Direction"
                width={500}
                height={500}
                priority
                className="block h-auto w-full dark:hidden"
              />
              <Image
                src="/EspaceDirectionDark.png"
                alt="Espace Direction"
                width={500}
                height={500}
                priority
                className="hidden h-auto w-full dark:block"
              />
            </Link>
          </Reveal>

        </div>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
            Fini les tableaux Excel que chacun gère de son côté, fini les feuilles volantes qui se
            perdent, fini le travail répété par chaque intervenant.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
            Un outil gratuit pour un travail de qualité : zéro paperasse répétitive, un partage
            facile et un croisement des données en quelques clics.
          </p>
          <p className="mt-4 text-base font-semibold text-brand-700 dark:text-brand-400">Gagnez en productivité ! </p>

          {/* Voir vaut mieux que lire : ces deux liens ont remplacé les guides.
              Placés après l'argumentaire plutôt que sous les cartes d'espace,
              ils répondent à la question qui vient de se former — à quoi ça
              ressemble ? — et peuvent donc être de vrais boutons, là où sous
              les cartes ils devaient rester discrets pour ne pas concurrencer
              l'entrée dans son propre espace.
              Les comptes de démonstration ne peuvent rien écrire (cf.
              lib/demo-mode.ts) : l'école fictive reste intacte d'une visite à
              l'autre. */}
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login/profs?demo=1"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              🎬 Démo enseignant·e
            </Link>
            <Link
              href="/login/direction?demo=1"
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:text-brand-300 dark:hover:border-stone-600"
            >
              🎬 Démo direction
            </Link>
          </div>
          <p className="relative mt-2.5 text-xs text-stone-400 dark:text-stone-500">
            Sans inscription, avec une école fictive — rien n&apos;y est enregistré.
          </p>
        </Reveal>

        {/* Preuve par les pairs, placée juste après les démonstrations :
            c'est l'instant où le visiteur se demande si l'outil vaut qu'on
            s'y attarde. Rien n'est affiché tant que le nombre d'avis reste
            trop faible pour qu'une moyenne veuille dire quelque chose (cf.
            lib/satisfaction.ts::MIN_AVIS_PUBLIC). */}
        {satisfaction && (
          <Reveal className="relative mt-16 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Ce qu&apos;en disent les utilisateurs
            </p>
            <div className="mt-4">
              <SatisfactionSummary moyenne={satisfaction.moyenne} total={satisfaction.total} />
            </div>
          </Reveal>
        )}

        <ReseauxEnseignementSection />
        <AboutUsSection />

        <p className="relative mt-10 text-center text-xs text-stone-500 dark:text-stone-400">
          <Link href="/confidentialite" className="hover:text-brand-700 hover:underline dark:hover:text-brand-400">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </div>
  );
}
