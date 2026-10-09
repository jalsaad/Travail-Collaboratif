import { PUBLIC_SITE_URL } from "@/lib/public-url";

// Partage de la plateforme vers les réseaux.
//
// DE SIMPLES LIENS, et c'est un choix. Les boutons officiels de Facebook ou
// LinkedIn chargent un script tiers qui dépose un cookie et piste le
// visiteur AVANT tout clic — il faudrait un bandeau de consentement, et la
// plateforme n'en a aucun. Ces URL de partage, elles, n'exécutent rien :
// aucune requête ne part tant que personne ne clique, et la page reste sans
// traceur. La politique de confidentialité n'a donc pas à changer.
//
// Pas de bouton « copier le lien » ni d'API Web Share : le premier demande
// du JavaScript pour un résultat que le clic droit donne déjà, la seconde
// n'existe pas sur l'ordinateur de la salle des profs.

// Écrit à la première personne, et c'est délibéré : ce message part juste
// après que la personne a mis 4 ou 5 étoiles. C'est un témoignage, pas une
// annonce — « moi aussi j'utilise » se partage, « la plateforme propose » se
// scrolle.
//
// Le domaine y figure EN TOUTES LETTRES : sur WhatsApp, le texte est tout ce
// qui part, et une messagerie transforme d'elle-même « travail-collaboratif.be »
// en lien cliquable. Les réseaux qui prennent l'URL dans un paramètre séparé
// (Facebook, LinkedIn, X) s'en servent pour composer leur aperçu.
const MESSAGE_DEFAUT =
  "Moi aussi j'utilise la plateforme gratuite travail-collaboratif.be. " +
  "Mes déclarations sont conformes aux circulaires, et ça me fait gagner un temps fou.";

const OBJET_EMAIL = "Travail Collaboratif — un outil gratuit pour les 60 périodes";

type Reseau = {
  nom: string;
  href: string;
  /// Couleurs de la marque, portées EN PERMANENCE par le glyphe : c'est à
  /// elles qu'on reconnaît un réseau d'un coup d'œil, bien avant d'en lire le
  /// nom. Au survol, la pastille s'emplit de cette couleur et le glyphe passe
  /// en blanc.
  couleur: string;
  survol: string;
  chemin: string;
};

function reseaux(message: string): Reseau[] {
  const url = PUBLIC_SITE_URL;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(message);
  /// Le lien complet sur sa propre ligne, pour les canaux où le texte est le
  /// seul véhicule. Voir le commentaire de WhatsApp ci-dessous.
  const tEtUrl = encodeURIComponent(`${message}\n\n${url}`);

  return [
    {
      nom: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      couleur: "text-[#1877F2]",
      survol: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
      chemin:
        "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
    },
    {
      nom: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      couleur: "text-[#0A66C2]",
      survol: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
      chemin:
        "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    },
    {
      nom: "WhatsApp",
      // L'URL COMPLÈTE est indispensable, même si le domaine figure déjà dans
      // la phrase. WhatsApp n'a pas de paramètre de lien distinct : le texte
      // est tout ce qui part. Or il ne reconnaît pas de façon fiable un
      // domaine écrit sans protocole — « travail-collaboratif.be » restait du
      // texte mort, sans lien cliquable, donc sans vignette à aller chercher.
      //
      // On avait d'abord retiré ce lien pour éviter que le domaine paraisse
      // deux fois : l'économie cosmétique coûtait le lien ET l'aperçu. Il est
      // donc remis, sur sa propre ligne — c'est là que WhatsApp va chercher
      // les métadonnées de la vignette.
      href: `https://wa.me/?text=${tEtUrl}`,
      couleur: "text-[#25D366]",
      survol: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
      chemin:
        "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488",
    },
    {
      nom: "X",
      // `url` conservé malgré le domaine déjà présent dans le texte,
      // contrairement à WhatsApp : c'est ce paramètre qui déclenche l'aperçu
      // enrichi. X sait bien reconnaître un domaine écrit sans protocole,
      // mais pas de façon garantie — et une publication sans vignette passe
      // beaucoup moins bien.
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      // Le noir de X disparaîtrait sur le fond sombre d'une fenêtre modale en
      // thème nuit : il s'y inverse en blanc.
      couleur: "text-stone-900 dark:text-white",
      survol: "hover:bg-stone-900 hover:text-white hover:border-stone-900 dark:hover:bg-white dark:hover:text-stone-900 dark:hover:border-white",
      chemin:
        "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
    },
  ];
}

export function ShareButtons({
  message = MESSAGE_DEFAUT,
  /// Taille réduite pour les emplacements contraints (tiroir, fenêtre modale).
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  const taille = compact ? "h-9 w-9" : "h-11 w-11";
  const icone = compact ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {reseaux(message).map((r) => (
        <a
          key={r.nom}
          href={r.href}
          target="_blank"
          // `noopener` ferme l'accès de la page ouverte à `window.opener` ;
          // `noreferrer` évite d'annoncer à Facebook depuis quelle page de la
          // plateforme le partage est parti.
          rel="noopener noreferrer"
          aria-label={`Partager sur ${r.nom}`}
          title={`Partager sur ${r.nom}`}
          className={`flex ${taille} items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${r.couleur} ${r.survol} dark:border-stone-700 dark:bg-stone-800`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={icone}>
            <path d={r.chemin} />
          </svg>
        </a>
      ))}

      {/* L'email n'est pas un réseau, mais c'est le canal par lequel une
          enseignante prévient réellement ses collègues. Icône dessinée au
          trait, faute de glyphe de marque. */}
      <a
        href={`mailto:?subject=${encodeURIComponent(OBJET_EMAIL)}&body=${encodeURIComponent(
          `${message}\n\n${PUBLIC_SITE_URL}`
        )}`}
        aria-label="Partager par email"
        title="Partager par email"
        className={`flex ${taille} items-center justify-center rounded-full border border-stone-200 bg-white text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-600 hover:bg-brand-600 hover:text-white hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:text-brand-400`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
          className={icone}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 7.5 8.5 6 8.5-6" />
        </svg>
      </a>
    </div>
  );
}
