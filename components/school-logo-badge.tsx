/// Blason en tête de page : le logo de l'école quand elle en a chargé un,
/// celui de la plateforme sinon.
///
/// CE QUI A CHANGÉ : on avait retiré le logo des écoles d'ici, par crainte
/// d'un conflit visuel entre des identités graphiques très diverses et celle
/// de l'application. À l'usage, c'était se priver du seul endroit où une
/// école se reconnaît chez elle — et le conflit redouté ne s'est pas produit,
/// le logo étant isolé, centré, sur fond neutre. Il revient donc, avec repli
/// sur le logo de la plateforme pour les écoles qui n'en ont pas chargé.
///
/// Le logo reste utilisé ailleurs sans changement : paramètres de l'école,
/// en-tête des exports PDF (cf. lib/export-logos.ts), affiche de
/// rattachement.
///
/// Les deux props sont FACULTATIVES : l'espace plateforme (app/admin) monte
/// ce blason hors de toute école et doit afficher le logo générique.
export function SchoolLogoBadge({
  logoUrl = null,
  schoolName = "Travail Collaboratif",
}: {
  /// `School.logoUrl`, null tant qu'aucun fichier n'a été envoyé.
  logoUrl?: string | null;
  schoolName?: string;
} = {}) {
  const estLogoEcole = Boolean(logoUrl);

  // Logo de la plateforme : nu, sans plaque ni halo. Sa transparence est
  // réelle (canal alpha vérifié) et le « t » se lit sur les deux thèmes —
  // l'encadrer serait un cadre sans raison.
  if (!estLogoEcole) {
    return (
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/TC3d.png"
          alt="Travail Collaboratif"
          className="h-[85px] w-[85px] object-contain sm:h-[127px] sm:w-[127px]"
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {/* `isolate` crée le contexte d'empilement dans lequel le halo en
          `-z-10` reste DERRIÈRE la plaque sans passer sous le fond de page. */}
      <div className="relative isolate">
        {/* Halo aux couleurs du logo, repris tel quel des cadres de connexion
            et d'inscription (cf. components/login-espace-card.tsx) : même
            dégradé, même flou, même opacité. Décoratif, donc masqué aux
            lecteurs d'écran. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl"
        />

        {/* PLAQUE CLAIRE, dans les DEUX thèmes — et c'est tout l'objet.

            Un logo d'école est téléversé tel quel (cf. lib/school-logo.ts),
            en PNG, JPEG, WEBP ou GIF. Or le JPEG n'a pas de canal alpha : son
            fond est opaque, presque toujours blanc. En thème sombre, ces
            logos-là posaient un carré blanc au milieu de la page — et un logo
            dessiné pour fond sombre aurait fait l'inverse en thème clair.

            Plutôt que de deviner le fond de chaque fichier, on le lui donne :
            posé sur une plaque claire dans les deux thèmes, chaque logo
            retrouve l'arrière-plan pour lequel il a été dessiné. Même parti
            pris que les avatars d'organisation de GitHub ou Slack.

            La plaque n'impose AUCUNE des deux dimensions. Seule la largeur
            du logo est posée ; sa hauteur suit le rapport naturel de l'image
            (`h-auto`), et la plaque épouse le tout. Un blason carré donne une
            plaque carrée, une bannière une plaque basse et large, un écusson
            vertical une plaque haute — au lieu du cadre carré qui laissait
            deux vides sur les côtés.

            `max-h` n'est PAS une hauteur imposée : c'est un garde-fou pour
            un logo au rapport extrême (1:3 et au-delà), qui occuperait
            sinon la moitié de l'écran. Aucun logo d'école ordinaire ne
            l'atteint.

            La marge au-dessus, elle, reste FIXE quelle que soit la hauteur
            obtenue : elle vient du `pt` de la mise en page (cf.
            app/(app)/layout.tsx), jamais du logo. Le haut de la plaque se
            trouve donc toujours au même endroit, d'une école à l'autre. */}
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:ring-stone-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl ?? ""}
            alt={schoolName}
            className="h-auto w-[100px] max-h-[170px] object-contain sm:w-[150px] sm:max-h-[230px]"
          />
        </div>
      </div>
    </div>
  );
}
