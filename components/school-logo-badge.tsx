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

  // Boîte carrée et `object-contain` : les logos d'école vont du blason
  // vertical à la bannière très large, et aucun ne doit être déformé ni
  // rogné.
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl || "/TC3d.png"}
      alt={estLogoEcole ? schoolName : "Travail Collaboratif"}
      className="h-[85px] w-[85px] object-contain sm:h-[127px] sm:w-[127px]"
    />
  );

  return (
    <div className="flex justify-center">
      {estLogoEcole ? (
        // PLAQUE CLAIRE, dans les DEUX thèmes — et c'est tout l'objet.
        //
        // Un logo d'école est téléversé tel quel (cf. lib/school-logo.ts), en
        // PNG, JPEG, WEBP ou GIF. Or le JPEG n'a pas de canal alpha : son
        // fond est opaque, presque toujours blanc. En thème sombre, ces
        // logos-là posaient donc un carré blanc au milieu de la page — et un
        // logo dessiné pour fond sombre aurait fait l'inverse en thème clair.
        //
        // Plutôt que de deviner le fond de chaque fichier, on le lui donne :
        // posé sur une plaque claire dans les deux thèmes, chaque logo
        // retrouve l'arrière-plan pour lequel il a été dessiné. Le carré
        // blanc cesse d'être un accident pour devenir un cadre. Même parti
        // pris que les avatars d'organisation de GitHub ou Slack.
        //
        // Le logo de la plateforme, lui, est réellement transparent (canal
        // alpha vérifié) et lisible sur les deux fonds : il reste nu.
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 dark:ring-stone-700">
          {image}
        </div>
      ) : (
        image
      )}
    </div>
  );
}
