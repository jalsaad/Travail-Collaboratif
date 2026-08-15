// ---------------------------------------------------------------------------
// scripts/exporter-prospection.ts
// Réunit les fichiers de prospection dans un classeur unique, à ouvrir dans
// Google Sheets (Drive → Nouveau → Importer un fichier) ou dans Excel.
//
//   npm run export-prospection
//
// Le classeur est une photographie : le compléter n'a aucun effet sur les CSV
// que lisent les scripts d'envoi. Pour corriger des adresses, éditez les CSV —
// ou réimportez vos corrections avec le script depuis Sheets (Fichier →
// Télécharger → CSV, séparateur point-virgule).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { lireCsv, type LigneCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");
const SORTIE = path.join(RACINE, "data/prospection.xlsx");

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/// Un onglet = un fichier, avec ses colonnes renommées en libellés lisibles et
/// une largeur par défaut adaptée au contenu.
type Onglet = {
  nom: string;
  fichier: string;
  colonnes: { cle: string; titre: string; largeur: number }[];
};

const ONGLETS: Onglet[] = [
  {
    nom: "Écoles",
    fichier: "data/prospection-ecoles.csv",
    colonnes: [
      { cle: "email_direction", titre: "Email direction", largeur: 34 },
      { cle: "nom", titre: "École", largeur: 46 },
      { cle: "niveau", titre: "Niveau", largeur: 13 },
      { cle: "code_postal", titre: "CP", largeur: 7 },
      { cle: "ville", titre: "Ville", largeur: 20 },
      { cle: "province", titre: "Province", largeur: 18 },
      { cle: "reseau", titre: "Réseau", largeur: 22 },
      { cle: "telephone", titre: "Téléphone", largeur: 16 },
      { cle: "site_web", titre: "Site web", largeur: 34 },
      { cle: "adresse", titre: "Adresse", largeur: 32 },
      { cle: "types_enseignement", titre: "Types d'enseignement", largeur: 34 },
      { cle: "email_source", titre: "Origine de l'adresse", largeur: 20 },
      { cle: "statut_envoi", titre: "Statut d'envoi", largeur: 14 },
    ],
  },
  {
    nom: "Pouvoirs organisateurs",
    fichier: "data/prospection-po.csv",
    colonnes: [
      { cle: "email_po", titre: "Email PO", largeur: 34 },
      { cle: "nom_po", titre: "Pouvoir organisateur", largeur: 52 },
      { cle: "nb_ecoles", titre: "Écoles", largeur: 8 },
      { cle: "reseaux", titre: "Réseau", largeur: 24 },
      { cle: "code_postal", titre: "CP", largeur: 7 },
      { cle: "localite", titre: "Localité", largeur: 20 },
      { cle: "adresse", titre: "Adresse", largeur: 30 },
      { cle: "site_web", titre: "Site web", largeur: 32 },
      { cle: "fase_po", titre: "N° FASE", largeur: 10 },
      { cle: "bce_po", titre: "N° BCE", largeur: 14 },
      { cle: "ecoles", titre: "Écoles rattachées", largeur: 80 },
      { cle: "email_source", titre: "Origine de l'adresse", largeur: 20 },
      { cle: "statut_envoi", titre: "Statut d'envoi", largeur: 14 },
    ],
  },
  {
    nom: "Collecte écoles",
    fichier: "data/collecte-rapport.csv",
    colonnes: [
      { cle: "nom", titre: "École", largeur: 46 },
      { cle: "code_postal", titre: "CP", largeur: 7 },
      { cle: "statut", titre: "Statut", largeur: 26 },
      { cle: "email_retenu", titre: "Adresse retenue", largeur: 34 },
      { cle: "score", titre: "Score", largeur: 8 },
      { cle: "autres_candidats", titre: "Candidates écartées", largeur: 70 },
      { cle: "site_web", titre: "Site visité", largeur: 34 },
      { cle: "pages_visitees", titre: "Pages", largeur: 8 },
    ],
  },
  {
    nom: "Collecte PO",
    fichier: "data/collecte-po-rapport.csv",
    colonnes: [
      { cle: "nom", titre: "Pouvoir organisateur", largeur: 46 },
      { cle: "statut", titre: "Statut", largeur: 26 },
      { cle: "email_retenu", titre: "Adresse retenue", largeur: 34 },
      { cle: "score", titre: "Score", largeur: 8 },
      { cle: "autres_candidats", titre: "Candidates écartées", largeur: 70 },
      { cle: "site_web", titre: "Site visité", largeur: 34 },
      { cle: "pages_visitees", titre: "Pages", largeur: 8 },
    ],
  },
];

// Couleurs de la plateforme (cf. app/globals.css) : bandeau d'en-tête brand-600
// et fond ambre pour ce qui reste à compléter à la main.
const BRAND_600 = "FF1F6FC4";
const A_COMPLETER = "FFFEF3C7";

function lireFichier(relatif: string): LigneCsv[] {
  const chemin = path.join(RACINE, relatif);
  if (!fs.existsSync(chemin)) return [];
  return lireCsv(fs.readFileSync(chemin, "utf8"));
}

function ajouterOnglet(classeur: ExcelJS.Workbook, onglet: Onglet, lignes: LigneCsv[]) {
  const feuille = classeur.addWorksheet(onglet.nom, {
    // L'en-tête reste visible au défilement, et le filtre permet de trier par
    // réseau ou par province sans rien manipuler.
    views: [{ state: "frozen", ySplit: 1 }],
  });

  feuille.columns = onglet.colonnes.map((c) => ({
    header: c.titre,
    key: c.cle,
    width: c.largeur,
  }));

  const entete = feuille.getRow(1);
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  entete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_600 } };
  entete.alignment = { vertical: "middle" };
  entete.height = 22;

  const colonneEmail = onglet.colonnes.findIndex((c) => c.cle.startsWith("email_") && c.cle !== "email_source");

  for (const ligne of lignes) {
    const ajoutee = feuille.addRow(onglet.colonnes.map((c) => ligne[c.cle] ?? ""));
    if (colonneEmail >= 0 && !EMAIL_VALIDE.test(ligne[onglet.colonnes[colonneEmail].cle] ?? "")) {
      // Ce qui reste à trouver saute aux yeux : c'est la seule chose que le
      // fichier demande à un humain.
      ajoutee.getCell(colonneEmail + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: A_COMPLETER },
      };
    }
  }

  feuille.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: onglet.colonnes.length },
  };
}

function ajouterSynthese(classeur: ExcelJS.Workbook, ecoles: LigneCsv[], po: LigneCsv[]) {
  const feuille = classeur.addWorksheet("Synthèse", { views: [{ state: "frozen", ySplit: 1 }] });
  feuille.columns = [
    { header: "Indicateur", key: "libelle", width: 52 },
    { header: "Valeur", key: "valeur", width: 14 },
  ];
  const entete = feuille.getRow(1);
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  entete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_600 } };

  const avecEmail = ecoles.filter((e) => EMAIL_VALIDE.test(e.email_direction ?? ""));
  const poAvecEmail = po.filter((p) => EMAIL_VALIDE.test(p.email_po ?? ""));
  const uniques = new Set(avecEmail.map((e) => e.email_direction.toLowerCase()));
  const parNiveau = (niveau: string) => ecoles.filter((e) => e.niveau === niveau).length;

  const lignes: [string, string | number][] = [
    ["Écoles au fichier", ecoles.length],
    ["  dont fondamental", parNiveau("Fondamental")],
    ["  dont secondaire", parNiveau("Secondaire")],
    ["Écoles avec une adresse", avecEmail.length],
    ["Adresses d'école uniques (destinataires)", uniques.size],
    ["Écoles restant à documenter", ecoles.length - avecEmail.length],
    ["", ""],
    ["Pouvoirs organisateurs", po.length],
    ["  avec un site officiel connu", po.filter((p) => p.site_web).length],
    ["  avec une adresse", poAvecEmail.length],
    ["Écoles couvertes par ces PO", poAvecEmail.reduce((t, p) => t + Number(p.nb_ecoles || 0), 0)],
    ["", ""],
    ["Généré le", new Date().toLocaleString("fr-BE")],
  ];

  for (const [libelle, valeur] of lignes) feuille.addRow([libelle, valeur]);
}

async function main() {
  const classeur = new ExcelJS.Workbook();
  classeur.creator = "Travail Collaboratif";
  classeur.created = new Date();

  const donnees = ONGLETS.map((o) => ({ onglet: o, lignes: lireFichier(o.fichier) }));
  const ecoles = donnees[0].lignes;
  const po = donnees[1].lignes;

  ajouterSynthese(classeur, ecoles, po);
  for (const { onglet, lignes } of donnees) {
    if (lignes.length === 0) {
      console.log(`(ignoré : ${onglet.fichier} est absent)`);
      continue;
    }
    ajouterOnglet(classeur, onglet, lignes);
    console.log(`${onglet.nom.padEnd(24)} ${String(lignes.length).padStart(4)} ligne(s)`);
  }

  await classeur.xlsx.writeFile(SORTIE);
  const taille = (fs.statSync(SORTIE).size / 1024).toFixed(0);
  console.log(`\nClasseur écrit : ${path.relative(RACINE, SORTIE)} (${taille} Ko)`);
  console.log("Google Sheets : Drive → Nouveau → Importation de fichier, puis ouvrir avec Sheets.");
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
