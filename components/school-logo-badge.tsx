export function SchoolLogoBadge() {
  return (
    <div className="flex justify-center">
      {/* Logo générique de la plateforme, identique pour toutes les écoles.
          Le vrai logo de chaque école (potentiellement très différent
          visuellement) n'est plus affiché ici pour éviter un conflit visuel
          avec l'identité graphique de l'application — il reste utilisé
          ailleurs sans changement (paramètres de l'école, en-tête des
          exports PDF, cf. lib/export-logos.ts). Seul cet affichage-ci est
          concerné. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/TC3d.png"
        alt="Travail Collaboratif"
        className="h-[85px] w-[85px] object-contain sm:h-[127px] sm:w-[127px]"
      />
    </div>
  );
}
