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
// qu'on accède au site via son domaine. APP_ORIGIN se règle dans .env
// (ex: "travail-collaboratif.be", sans protocole).
const productionOrigin = process.env.APP_ORIGIN;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        ...(codespaceOrigin ? [codespaceOrigin] : []),
        ...(productionOrigin ? [productionOrigin] : []),
        "*.app.github.dev",
      ],
    },
  },
  // pdfkit charge ses fichiers de polices (.afm) via des chemins relatifs à
  // l'exécution — le bundling webpack de Next casse cette résolution. On
  // l'exclut du bundle pour qu'il soit simplement require() depuis
  // node_modules à l'exécution, où ses chemins relatifs restent valides.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
