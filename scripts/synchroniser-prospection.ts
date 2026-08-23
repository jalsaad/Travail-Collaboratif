// ---------------------------------------------------------------------------
// scripts/synchroniser-prospection.ts
// Relie le fichier de prospection à l'annuaire, puis reporte dans la base les
// écoles déjà contactées.
//
//   npm run synchro-prospection                 # analyse, n'écrit rien
//   npm run synchro-prospection -- --ecrire     # inscrit le FASE et le suivi
//
// Deux opérations, dans cet ordre :
//
//   1. APPARIEMENT. Le fichier de prospection ne porte pas de numéro FASE,
//      seul identifiant commun avec l'annuaire. On le retrouve par le nom et
//      le code postal, puis on l'inscrit dans une colonne `numero_fase` : les
//      exécutions suivantes, et la campagne elle-même, n'auront plus à deviner.
//
//   2. REPORT DU SUIVI. Le journal des envois dit qui a déjà reçu l'invitation.
//      Ces écoles passent de « à contacter » à « contactée » dans la base, avec
//      la date réelle de l'envoi — celle du journal, pas celle du jour.
//
// Idempotent : relancé, il ne fait avancer que ce qui doit l'être.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chargerEnvLocal } from "../lib/env-local";
import { colonnesDe, ecrireCsv, lireCsv, type LigneCsv } from "../lib/prospection-csv";
import { marquerContactee } from "../lib/prospection-suivi";

const RACINE = path.resolve(__dirname, "..");
chargerEnvLocal(RACINE);

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const ecrire = args.includes("--ecrire");
const FICHIER = path.join(RACINE, "data/prospection-ecoles.csv");
const JOURNAL = path.join(RACINE, "data/prospection-journal.csv");

/// Réduit un nom d'école à ses mots, sans accents ni ponctuation : l'annuaire
/// et le fichier de prospection ne les orthographient pas toujours pareil.
const normaliser = (valeur: string) =>
  valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/// Mots porteurs de sens : sans eux, « École communale » ressemblerait à
/// « École communale » de la commune voisine.
const motsCles = (nom: string) =>
  new Set(normaliser(nom).split(" ").filter((m) => m.length > 3));

async function main() {
  if (!fs.existsSync(FICHIER)) {
    console.error(`Fichier introuvable : ${FICHIER}`);
    process.exitCode = 1;
    return;
  }

  const contenu = fs.readFileSync(FICHIER, "utf8");
  const colonnes = colonnesDe(contenu);
  const lignes = lireCsv(contenu);
  if (!colonnes.includes("numero_fase")) colonnes.push("numero_fase");

  const annuaire = await prisma.fwbSchool.findMany({
    select: { numeroFase: true, name: true, postalCode: true },
  });
  const parCodePostal = new Map<string, typeof annuaire>();
  for (const e of annuaire) {
    const cle = e.postalCode ?? "";
    parCodePostal.set(cle, [...(parCodePostal.get(cle) ?? []), e]);
  }

  // --- 1. Appariement ------------------------------------------------------
  let dejaConnues = 0;
  let appariees = 0;
  const ambigues: LigneCsv[] = [];
  const orphelines: LigneCsv[] = [];

  for (const l of lignes) {
    if ((l.numero_fase ?? "").trim() !== "") {
      dejaConnues++;
      continue;
    }
    const candidates = parCodePostal.get((l.code_postal ?? "").trim()) ?? [];

    // Le nom exact d'abord : c'est le cas de l'écrasante majorité.
    let retenues = candidates.filter((e) => normaliser(e.name) === normaliser(l.nom ?? ""));

    // À défaut, les mots significatifs de l'un doivent tous se retrouver dans
    // l'autre — « Institut Sainte-Marie » et « Institut Sainte-Marie (CEFA) »
    // sont la même école, « Sainte-Marie » et « Saint-Joseph » ne le sont pas.
    if (retenues.length === 0) {
      const cible = motsCles(l.nom ?? "");
      retenues = candidates.filter((e) => {
        const source = motsCles(e.name);
        if (source.size === 0 || cible.size === 0) return false;
        const communs = [...source].filter((m) => cible.has(m)).length;
        return communs >= Math.min(source.size, cible.size);
      });
    }

    if (retenues.length === 1) {
      l.numero_fase = retenues[0].numeroFase;
      appariees++;
    } else if (retenues.length > 1) {
      ambigues.push(l);
    } else {
      orphelines.push(l);
    }
  }

  console.log("APPARIEMENT");
  console.log(`  ${dejaConnues} école(s) portaient déjà leur numéro FASE`);
  console.log(`  ${appariees} rapprochée(s)`);
  if (ambigues.length > 0) {
    console.log(`  ${ambigues.length} ambiguë(s) — à trancher à la main :`);
    for (const l of ambigues.slice(0, 10)) {
      console.log(`      ${l.code_postal} ${l.nom}`);
    }
  }
  if (orphelines.length > 0) {
    console.log(`  ${orphelines.length} sans correspondance dans l'annuaire`);
  }

  // --- 2. Report du suivi --------------------------------------------------
  // Le journal donne l'adresse servie et la date ; le fichier donne le FASE.
  const contactes = new Map<string, Date>();
  if (fs.existsSync(JOURNAL)) {
    for (const entree of lireCsv(fs.readFileSync(JOURNAL, "utf8"))) {
      if (entree.statut !== "envoye") continue;
      const email = (entree.email ?? "").trim().toLowerCase();
      const date = new Date(entree.date ?? "");
      if (!email || Number.isNaN(date.getTime())) continue;
      // Le premier envoi fait foi : c'est la date du premier contact.
      if (!contactes.has(email) || date < contactes.get(email)!) contactes.set(email, date);
    }
  }

  const aReporter = lignes
    .filter((l) => (l.numero_fase ?? "").trim() !== "")
    .map((l) => ({ ligne: l, quand: contactes.get((l.email_direction ?? "").trim().toLowerCase()) }))
    .filter((x): x is { ligne: LigneCsv; quand: Date } => x.quand !== undefined);

  console.log("\nSUIVI");
  console.log(`  ${contactes.size} adresse(s) servie(s) selon le journal`);
  console.log(`  ${aReporter.length} école(s) à marquer « contactée » dans l'annuaire`);

  if (!ecrire) {
    console.log("\nAnalyse seule : ni le fichier ni la base n'ont été modifiés.");
    console.log("Relancez avec --ecrire.");
    return;
  }

  fs.writeFileSync(FICHIER, ecrireCsv(colonnes, lignes), "utf8");
  console.log(`\nColonne « numero_fase » écrite dans ${path.basename(FICHIER)}.`);

  const bilan = { marquée: 0, inconnue: 0, erreur: 0 };
  for (const { ligne, quand } of aReporter) {
    const resultat = await marquerContactee(
      prisma,
      ligne.numero_fase,
      (ligne.email_direction ?? "").trim() || null,
      quand
    );
    bilan[resultat]++;
  }
  console.log(
    `Annuaire : ${bilan.marquée} école(s) marquée(s), ` +
      `${bilan.inconnue} introuvable(s), ${bilan.erreur} en échec.`
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
