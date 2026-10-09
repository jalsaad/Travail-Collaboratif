// ---------------------------------------------------------------------------
// scripts/generer-og-card.ts
// Compose public/og-card.png — la vignette 1200x630 que Facebook, LinkedIn et
// X affichent quand quelqu'un partage la plateforme.
//
//   npm run og-card
//
// POURQUOI UN SCRIPT, ET PAS UNE IMAGE DÉPOSÉE À LA MAIN : le PNG est versionné
// (les robots des réseaux ne savent pas exécuter notre code, il leur faut un
// fichier servi tel quel), mais une image binaire sans source devient
// intouchable au premier changement de slogan. Ici, le texte se modifie
// ci-dessous et la vignette se régénère.
//
// POURQUOI PAS LE LOGO SEUL : les trois réseaux attendent du 1200x630. Une
// image d'un autre rapport est encadrée de bandes grises, ou recadrée au
// hasard. Cette composition est faite pour ce cadre précis.
//
// Les polices sont celles du système : le rendu SVG de sharp n'embarque
// aucune fonte. La pile ci-dessous couvre Windows, macOS et les serveurs
// Linux usuels — à vérifier d'un coup d'œil sur le PNG produit si vous la
// régénérez ailleurs.
// ---------------------------------------------------------------------------

import path from "node:path";
import sharp from "sharp";

const RACINE = path.resolve(__dirname, "..");

const W = 1200;
const H = 630;
const BLEU = "#2E86DE";
const TEAL = "#14B8A6";

/// Ratio natif de public/TC3d.png (537x696), pour ne pas déformer le logo.
const LOGO_H = 330;
const LOGO_W = Math.round((LOGO_H * 537) / 696);
const LOGO_X = 118;
const LOGO_Y = Math.round((H - LOGO_H) / 2) - 10;

/// Colonne de texte, à droite du logo.
const TX = 430;
const POLICE = "Segoe UI, Candara, Calibri, Arial, Helvetica, sans-serif";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${BLEU}"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </linearGradient>
    <radialGradient id="halo1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${BLEU}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${BLEU}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${TEAL}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${TEAL}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <circle cx="90" cy="70" r="330" fill="url(#halo1)"/>
  <circle cx="1140" cy="580" r="360" fill="url(#halo2)"/>

  <text x="${TX}" y="248" font-family="${POLICE}" font-size="62" font-weight="700" fill="#1C1917">Travail Collaboratif</text>
  <text x="${TX}" y="312" font-family="${POLICE}" font-size="34" font-weight="400" fill="#44403C">Vos 60 périodes, sans tableur.</text>

  <rect x="${TX}" y="348" width="64" height="4" rx="2" fill="url(#bar)"/>

  <text x="${TX}" y="408" font-family="${POLICE}" font-size="26" font-weight="400" fill="#57534E">Gratuit · Circulaires 7167 et 8894</text>
  <text x="${TX}" y="452" font-family="${POLICE}" font-size="26" font-weight="400" fill="#57534E">Fédération Wallonie-Bruxelles</text>

  <text x="${TX}" y="520" font-family="${POLICE}" font-size="29" font-weight="700" fill="${BLEU}">travail-collaboratif.be</text>

  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="url(#bar)"/>
</svg>`;

async function main() {
  const logo = await sharp(path.join(RACINE, "public/TC3d.png"))
    .resize(LOGO_W, LOGO_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const sortie = path.join(RACINE, "public/og-card.png");
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, left: LOGO_X, top: LOGO_Y }])
    .png()
    .toFile(sortie);

  const meta = await sharp(sortie).metadata();
  console.log(`Vignette écrite : ${path.relative(RACINE, sortie)} (${meta.width}x${meta.height})`);
  console.log(
    `\nAprès déploiement, passez l'adresse du site dans le débogueur de partage de\n` +
      `Facebook pour forcer le rafraîchissement de leur cache :\n` +
      `  https://developers.facebook.com/tools/debug/`
  );
}

main().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});
