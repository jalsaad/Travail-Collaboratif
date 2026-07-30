// Logos officiels des réseaux d'enseignement de la Fédération
// Wallonie-Bruxelles (fournis par l'utilisateur), rognés au plus près de leur
// contenu réel (marges blanches/transparentes supprimées — cf.
// bounding-box par canal alpha ou par différence au fond selon le format
// source, WBE et CECP recadrés via leur viewBox/pixels d'origine) pour un
// rendu optimal dans le carrousel. Affichés en nuances de gris (filtre CSS
// non destructif, cf. classe "grayscale") pour rester neutre visuellement —
// un fond blanc uniforme absorbe les logos qui ont eux-mêmes un fond opaque
// (ex: FELSI, ECIB) au lieu de laisser apparaître leur couleur d'origine.
// Chaque URL a été vérifiée (chargement réel via navigateur, code 200 et
// titre de page cohérent avec l'organisme) avant d'être ajoutée ici.
const RESEAUX_LOGOS = [
  {
    src: "/wbe-logo-cropped.svg",
    alt: "Wallonie-Bruxelles Enseignement (WBE)",
    href: "https://www.wbe.be/",
  },
  { src: "/cpeons-logo-cropped.png", alt: "CPEONS", href: "https://www.cpeons.be/" },
  { src: "/cecp-logo-cropped.png", alt: "CECP", href: "https://www.cecp.be/" },
  { src: "/felsi-logo-cropped.png", alt: "FELSI", href: "https://www.felsi.eu/" },
  {
    src: "/aebe-logo-cropped.png",
    alt: "AEBE — Écoles à programme belge à l'étranger",
    href: "https://www.aebe.be/",
  },
  {
    src: "/segec-logo-cropped.png",
    alt: "SeGEC — Enseignement catholique",
    href: "https://enseignement.catholique.be/",
  },
  { src: "/ecib-logo-cropped.png", alt: "ECIB", href: "https://po-ecib.be/web/" },
];

// Contenu dupliqué une fois : le carrousel défile de 0 à -50% de sa propre
// largeur (cf. .animate-marquee dans globals.css) — comme les deux moitiés
// sont identiques, la boucle est invisible et le défilement paraît continu.
const CAROUSEL_LOGOS = [...RESEAUX_LOGOS, ...RESEAUX_LOGOS];

export function ReseauxEnseignementSection() {
  return (
    <div className="mt-16 border-t border-stone-200 pt-8 text-center dark:border-stone-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Réseaux d&apos;enseignement et PO francophones belges pris en charge
      </h2>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        {/* La pause au survol est gérée par .animate-marquee:hover dans
            globals.css (survoler un logo suffit, :hover reste actif sur les
            ancêtres tant que le pointeur est au-dessus d'un enfant). */}
        <div className="flex w-max animate-marquee gap-4">
          {CAROUSEL_LOGOS.map((logo, i) => (
            <a
              key={`${logo.src}-${i}`}
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              title={logo.alt}
              // dark:invert : effet "négatif" en mode Dark (la carte blanche
              // devient noire, le logo en nuances de gris s'éclaircit) plutôt
              // que de garder des cartes blanches plaquées sur fond sombre.
              className="flex h-[83px] w-48 shrink-0 items-center justify-center rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-200 transition hover:scale-105 hover:shadow-md dark:invert"
            >
              {/* Logos statiques fournis par l'utilisateur, tailles/formats
                  hétérogènes (svg/png/gif/webp/jpg) — un <img> simple avec
                  object-contain évite les contraintes de ratio de next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo.src} alt={logo.alt} className="max-h-14 w-auto object-contain grayscale" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
