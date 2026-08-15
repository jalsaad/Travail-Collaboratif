// ---------------------------------------------------------------------------
// lib/env-local.ts
// Lecture de .env pour les scripts lancés hors de Next : ts-node ne passe pas
// par le chargement d'environnement du framework. Six lignes plutôt qu'une
// dépendance, et les variables déjà présentes dans l'environnement gagnent
// toujours (SMTP_HOST=... npm run invitations reste prioritaire sur .env).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

export function chargerEnvLocal(racine: string) {
  const fichier = path.join(racine, ".env");
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(ligne);
    if (!m) continue;
    const valeur = m[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (process.env[m[1]] === undefined) process.env[m[1]] = valeur;
  }
}
