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

  return (
    <div className="flex justify-center">
      {/* Boîte carrée et `object-contain` : les logos d'école vont du blason
          vertical à la bannière très large, et aucun ne doit être déformé ni
          rogné. Taille réduite d'un quart (85 → 64, 127 → 96) — le blason
          prenait le tiers de l'écran d'un téléphone avant le moindre
          contenu. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || "/TC3d.png"}
        alt={estLogoEcole ? schoolName : "Travail Collaboratif"}
        className="h-16 w-16 object-contain sm:h-24 sm:w-24"
      />
    </div>
  );
}
