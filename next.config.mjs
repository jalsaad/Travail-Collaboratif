// Next.js valide que l'origine des requêtes Server Actions correspond à
// l'hôte attendu (protection CSRF). En Codespaces, l'app est servie derrière
// un domaine de port-forwarding différent de "localhost:3000" vu par le
// serveur — il faut l'autoriser explicitement, sinon toute action serveur
// (login, confirmer une période, etc.) échoue avec "Invalid Server Actions
// request." dès qu'on accède via l'URL *.app.github.dev.
const codespaceOrigin =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined;

// Même contrainte en production derrière un nom de domaine réel : sans ça,
// toute action serveur échoue avec "Invalid Server Actions request." dès
// qu'on accède au site via son domaine. APP_ORIGIN se règle dans .env, avec
// ou sans protocole (les scripts de campagne y attendent une URL complète).
//
// Toutes les façons d'écrire le même domaine sont autorisées, car Next compare
// l'en-tête Origin du navigateur à l'hôte transmis par nginx, et la moindre
// différence d'écriture annule l'action :
//   - avec et sans "www" ;
//   - avec un POINT FINAL ("www.travail-collaboratif.be."), qui est la forme
//     absolue d'un nom DNS. Un navigateur qui ouvre cette URL — autocomplétion,
//     ancien signet, lien copié — envoie un Origin pointé alors que nginx
//     transmet l'hôte sans point : la connexion échouait alors avec
//     « Application error: a server-side exception has occurred », vécu en
//     production le 01/10/2026.
function originesDuDomaine(valeur) {
  const hote = String(valeur)
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    .trim()
    .toLowerCase();
  if (!hote) return [];
  const sansWww = hote.replace(/^www\./, "");
  const hotes = [...new Set([sansWww, `www.${sansWww}`])];
  return hotes.flatMap((h) => [h, `${h}.`]);
}

const productionOrigins = process.env.APP_ORIGIN ? originesDuDomaine(process.env.APP_ORIGIN) : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        ...(codespaceOrigin ? [codespaceOrigin] : []),
        ...productionOrigins,
        "*.app.github.dev",
      ],
    },
  },
  // Les guides HTML sont abandonnés au profit des démonstrations, et leurs
  // fichiers supprimés de public/. Mais leur adresse circule encore : elle
  // figure dans les 142 invitations déjà envoyées aux directions, qui
  // restent dans des boîtes mail pour des mois. Sans ces redirections, une
  // direction qui ouvre enfin l'email tombe sur un 404 — le pire accueil
  // possible pour quelqu'un qui se décidait justement à regarder.
  //
  // Permanentes (308) : les guides ne reviendront pas.
  async redirects() {
    return [
      { source: "/guides/guide-direction.html", destination: "/login/direction?demo=1", permanent: true },
      { source: "/guides/guide-enseignant.html", destination: "/login/profs?demo=1", permanent: true },
    ];
  },

  // pdfkit charge ses fichiers de polices (.afm) via des chemins relatifs à
  // l'exécution — le bundling webpack de Next casse cette résolution. On
  // l'exclut du bundle pour qu'il soit simplement require() depuis
  // node_modules à l'exécution, où ses chemins relatifs restent valides.
  //
  // sharp est un module natif (binaires .node par plateforme) : il ne peut
  // pas davantage être bundlé. Il sert à convertir en PNG les logos WEBP/GIF
  // que pdfkit ne sait pas embarquer (cf. lib/export-logos.ts).
  serverExternalPackages: ["pdfkit", "sharp"],
};

export default nextConfig;
