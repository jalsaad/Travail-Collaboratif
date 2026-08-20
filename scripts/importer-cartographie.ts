// ---------------------------------------------------------------------------
// scripts/importer-cartographie.ts
// Charge l'annuaire officiel des écoles de la Fédération Wallonie-Bruxelles
// (data/Cartographie-Ecoles-FWB.csv) dans la table fwb_schools.
//
//   npm run cartographie                 # simulation : compte, n'écrit rien
//   npm run cartographie -- --confirmer  # écrit en base
//   npm run cartographie -- --fichier=/chemin/autre.csv
//
// Le fichier donne une ligne par IMPLANTATION — 8 052 lignes pour 2 972
// établissements, jusqu'à trente pour un seul. L'import regroupe par numéro
// FASE d'établissement et agrège les types d'enseignement, que deux
// établissements sur trois cumulent.
//
// Réexécutable sans dommage : les colonnes officielles sont réécrites depuis
// le fichier, les colonnes de relance (email, téléphone, statut, notes) ne
// sont jamais touchées. Une réédition annuelle de l'annuaire se rejoue donc
// par-dessus le travail de prospection déjà accompli.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chargerEnvLocal } from "../lib/env-local";
import { lireCsv } from "../lib/prospection-csv";
import { decomposerTypes, normaliserFase } from "../lib/fwb-directory";

const RACINE = path.resolve(__dirname, "..");
chargerEnvLocal(RACINE);

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const confirmer = args.includes("--confirmer");
const fichier =
  args.find((a) => a.startsWith("--fichier="))?.split("=")[1] ??
  path.join(RACINE, "data/Cartographie-Ecoles-FWB.csv");

const C = {
  fase: "N° FASE de l'établissement",
  nom: "Nom d'établissement",
  bce: "Numéro BCE de l'établissement",
  type: "Type d'enseignement",
  reseau: "Réseau",
  adresse: "Adresse de l'établissement",
  codePostal: "code_postal_de_l_etablissement",
  localite: "Localité de l'établissement",
  commune: "Commune de l'établissement",
  bassin: "Bassin",
  arrondissement: "arrondissement_administratif",
  latitude: "Latitude",
  longitude: "Longitude",
  poFase: "N° FASE du PO",
  poNom: "Nom du PO",
  poBce: "Numéro BCE du PO",
  poAdresse: "Adresse du PO",
  poCodePostal: "Code postal du PO",
  poLocalite: "Localité du PO",
};

type Etablissement = {
  numeroFase: string;
  name: string;
  numeroBce: string | null;
  types: Set<string>;
  reseau: string;
  address: string | null;
  postalCode: string | null;
  locality: string | null;
  commune: string | null;
  bassin: string | null;
  arrondissement: string | null;
  latitude: number | null;
  longitude: number | null;
  implantationCount: number;
  poFase: string | null;
  poName: string | null;
  poBce: string | null;
  poAddress: string | null;
  poPostalCode: string | null;
  poLocality: string | null;
};

const texte = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

const nombre = (v: string | undefined) => {
  const t = (v ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

async function main() {
  if (!fs.existsSync(fichier)) {
    console.error(`Fichier introuvable : ${fichier}`);
    process.exitCode = 1;
    return;
  }

  const lignes = lireCsv(fs.readFileSync(fichier, "utf8"), ",");
  console.log(`${lignes.length} implantations lues dans ${path.basename(fichier)}`);

  const parFase = new Map<string, Etablissement>();
  let sansFase = 0;

  for (const l of lignes) {
    const numeroFase = normaliserFase(l[C.fase] ?? "");
    if (!numeroFase) {
      sansFase++;
      continue;
    }

    const existant = parFase.get(numeroFase);
    if (existant) {
      existant.types.add((l[C.type] ?? "").trim());
      existant.implantationCount++;
      // Les coordonnées manquent sur quelques implantations : on retient les
      // premières disponibles plutôt que d'écraser par du vide.
      existant.latitude ??= nombre(l[C.latitude]);
      existant.longitude ??= nombre(l[C.longitude]);
      continue;
    }

    parFase.set(numeroFase, {
      numeroFase,
      name: (l[C.nom] ?? "").trim(),
      numeroBce: texte(l[C.bce]),
      types: new Set([(l[C.type] ?? "").trim()]),
      reseau: (l[C.reseau] ?? "").trim(),
      address: texte(l[C.adresse]),
      postalCode: texte(l[C.codePostal]),
      locality: texte(l[C.localite]),
      commune: texte(l[C.commune]),
      bassin: texte(l[C.bassin]),
      arrondissement: texte(l[C.arrondissement]),
      latitude: nombre(l[C.latitude]),
      longitude: nombre(l[C.longitude]),
      implantationCount: 1,
      poFase: normaliserFase(l[C.poFase] ?? ""),
      poName: texte(l[C.poNom]),
      poBce: texte(l[C.poBce]),
      poAddress: texte(l[C.poAdresse]),
      poPostalCode: texte(l[C.poCodePostal]),
      poLocality: texte(l[C.poLocalite]),
    });
  }

  const etablissements = [...parFase.values()];
  const sansCoordonnees = etablissements.filter((e) => e.latitude === null).length;
  const multiSites = etablissements.filter((e) => e.implantationCount > 1).length;

  console.log(`${etablissements.length} établissements distincts`);
  console.log(`  dont ${multiSites} à implantations multiples`);
  if (sansCoordonnees) console.log(`  dont ${sansCoordonnees} sans coordonnées GPS`);
  if (sansFase) console.log(`  ${sansFase} ligne(s) écartée(s) faute de numéro FASE exploitable`);

  const parReseau = new Map<string, number>();
  for (const e of etablissements) parReseau.set(e.reseau, (parReseau.get(e.reseau) ?? 0) + 1);
  console.log("\nPar réseau");
  for (const [reseau, n] of [...parReseau].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${reseau}`);
  }

  if (!confirmer) {
    console.log("\nSimulation : rien n'a été écrit. Relancez avec --confirmer.");
    return;
  }

  const avant = await prisma.fwbSchool.count();
  let ecrits = 0;

  for (const e of etablissements) {
    const types = [...e.types].filter(Boolean).sort();
    const { niveaux, genres } = decomposerTypes(types);
    const officiel = {
      name: e.name,
      numeroBce: e.numeroBce,
      typesEnseignement: types,
      niveaux,
      genres,
      reseau: e.reseau,
      address: e.address,
      postalCode: e.postalCode,
      locality: e.locality,
      commune: e.commune,
      bassin: e.bassin,
      arrondissement: e.arrondissement,
      latitude: e.latitude,
      longitude: e.longitude,
      implantationCount: e.implantationCount,
      poFase: e.poFase,
      poName: e.poName,
      poBce: e.poBce,
      poAddress: e.poAddress,
      poPostalCode: e.poPostalCode,
      poLocality: e.poLocality,
    };

    // `update` ne porte que sur les colonnes officielles : email, téléphone,
    // statut de prospection et notes survivent à un réimport.
    await prisma.fwbSchool.upsert({
      where: { numeroFase: e.numeroFase },
      create: { numeroFase: e.numeroFase, ...officiel },
      update: officiel,
    });
    ecrits++;
    if (ecrits % 500 === 0) console.log(`  ${ecrits} / ${etablissements.length}…`);
  }

  const apres = await prisma.fwbSchool.count();
  console.log(`\n${ecrits} établissements écrits — ${apres - avant} nouveaux, ${apres} en base.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
