// ---------------------------------------------------------------------------
// lib/prospection-csv.ts
// Lecture/écriture du fichier de prospection (data/prospection-ecoles.csv) et
// de son journal. Séparateur « ; », guillemets doublés — le format qu'Excel et
// LibreOffice ouvrent sans boîte de dialogue en français.
//
// Analyseur maison plutôt qu'une dépendance : ces fichiers sont produits et
// relus ici, et le script de campagne doit tourner sans installer quoi que ce
// soit de plus que ce que la plateforme utilise déjà.
// ---------------------------------------------------------------------------

export type LigneCsv = Record<string, string>;

export function lireCsv(contenu: string): LigneCsv[] {
  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let dansGuillemets = false;

  // Le BOM d'un fichier réenregistré depuis Excel collerait à l'en-tête de la
  // première colonne et casserait l'accès par nom.
  const texte = contenu.replace(/^﻿/, "");

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champ += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === ";") {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ.replace(/\r$/, ""));
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else {
      champ += c;
    }
  }
  if (champ || ligne.length) {
    ligne.push(champ.replace(/\r$/, ""));
    lignes.push(ligne);
  }

  const [entetes, ...corps] = lignes;
  if (!entetes) return [];
  return corps
    .filter((l) => l.some((v) => v.trim() !== ""))
    .map((l) => Object.fromEntries(entetes.map((h, i) => [h.trim(), (l[i] ?? "").trim()])));
}

export function echapperCsv(valeur: string): string {
  return /[";\r\n]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur;
}

export function ecrireCsv(colonnes: string[], lignes: LigneCsv[]): string {
  const entete = colonnes.map(echapperCsv).join(";");
  const corps = lignes.map((l) => colonnes.map((c) => echapperCsv(l[c] ?? "")).join(";"));
  return [entete, ...corps].join("\n") + "\n";
}

/// En-têtes du fichier tels quels : réécrire une ligne ne doit ni réordonner
/// ni perdre une colonne ajoutée à la main dans le tableur.
export function colonnesDe(contenu: string): string[] {
  const premiere = contenu.replace(/^﻿/, "").split("\n")[0] ?? "";
  return premiere
    .split(";")
    .map((c) => c.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
}
