// ---------------------------------------------------------------------------
// scripts/generer-adresses-cfwb.ts
// Génère, pour chaque école de l'annuaire (fwb_schools), l'adresse de sa boîte
// mail administrative (BMA) et celle de son pouvoir organisateur.
//
//   npm run adresses-cfwb                        # data/adresses-cfwb.csv
//   npm run adresses-cfwb -- --stdout            # CSV sur la sortie standard
//   npm run adresses-cfwb -- --fichier=chemin.csv
//
// RÈGLE DE COMPOSITION, vérifiée — elle ne varie PAS d'un réseau à l'autre :
//
//   établissement      ec + numéro FASE sur 6 chiffres + @adm.cfwb.be
//   pouvoir organisateur  po + numéro FASE du PO sur 6 chiffres + @adm.cfwb.be
//
// Source : circulaire 9563 du 20/08/2025 (« Boîtes mails administratives ») et
// la FAQ de l'administration, http://www.enseignement.be/index.php?page=28724.
// Confirmé par un cas réel : ec005464@adm.cfwb.be = École communale
// d'Anvaing, FASE 5464. Les deux préfixes distinguent l'établissement du PO,
// pas le réseau : aucune table par réseau n'est donc nécessaire.
//
// ⚠ CES ADRESSES NE DOIVENT PAS SERVIR À UNE CAMPAGNE. La BMA est le canal
// réservé aux échanges administratifs avec le ministère : la FAQ précise
// qu'elle « ne doit ni être diffusée, ni être utilisée à d'autres fins que les
// communications administratives avec le ministère de la FW-B ». Y envoyer une
// invitation à la plateforme contreviendrait à cet usage, serait vraisembla-
// blement filtré, et exposerait à un signalement auprès de l'administration
// même dont les circulaires fondent le produit. Ce script sert à CONNAÎTRE ces
// adresses (recoupement, vérification d'un contact déjà obtenu), pas à écrire
// à 8 000 écoles — d'où l'absence de passerelle vers
// scripts/inviter-directions.ts.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chargerEnvLocal } from "../lib/env-local";
import { ecrireCsv, type LigneCsv } from "../lib/prospection-csv";

const RACINE = path.resolve(__dirname, "..");
chargerEnvLocal(RACINE);

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const versStdout = args.includes("--stdout");
const FICHIER =
  args.find((a) => a.startsWith("--fichier="))?.split("=")[1] ??
  path.join(RACINE, "data/adresses-cfwb.csv");
const DOMAINE = "adm.cfwb.be";

// En mode --stdout, seul le CSV va sur la sortie standard.
const info = versStdout ? console.error : console.log;

const COLONNES = [
  "numero_fase",
  "nom",
  "reseau",
  "code_postal",
  "commune",
  "bma_etablissement",
  "po_fase",
  "po_nom",
  "bma_po",
  "email_direction_connu",
] as const;

/// L'annuaire écrit le FASE en décimal (« 5464.0 ») : on le ramène à ses
/// chiffres avant de le compléter à 6. Tout ce qui n'est pas un entier de 6
/// chiffres au plus ne donne pas d'adresse — mieux vaut une case vide qu'une
/// adresse fantaisiste.
function bma(prefixe: "ec" | "po", fase: string | null): string {
  const chiffres = (fase ?? "").trim().replace(/\.0+$/, "");
  if (!/^\d{1,6}$/.test(chiffres)) return "";
  return `${prefixe}${chiffres.padStart(6, "0")}@${DOMAINE}`;
}

async function main() {
  const ecoles = await prisma.fwbSchool.findMany({
    orderBy: [{ reseau: "asc" }, { postalCode: "asc" }, { name: "asc" }],
  });

  const lignes: LigneCsv[] = [];
  const sansAdresse: string[] = [];
  let sansPo = 0;

  for (const e of ecoles) {
    const adresseEcole = bma("ec", e.numeroFase);
    if (!adresseEcole) {
      sansAdresse.push(`${e.numeroFase} (${e.name})`);
      continue;
    }
    const adressePo = bma("po", e.poFase);
    if (!adressePo) sansPo++;

    lignes.push({
      numero_fase: e.numeroFase.trim(),
      nom: e.name,
      reseau: e.reseau,
      code_postal: e.postalCode ?? "",
      commune: e.commune ?? "",
      bma_etablissement: adresseEcole,
      po_fase: e.poFase ?? "",
      po_nom: e.poName ?? "",
      bma_po: adressePo,
      email_direction_connu: e.emailDirection ?? "",
    });
  }

  const csv = ecrireCsv([...COLONNES], lignes);
  if (versStdout) process.stdout.write(csv);
  else fs.writeFileSync(FICHIER, csv, "utf8");

  info(`Écoles dans l'annuaire : ${ecoles.length}`);
  info(`Adresses générées      : ${lignes.length}`);
  info(`Sans adresse de PO     : ${sansPo}`);
  const parReseau = new Map<string, number>();
  for (const l of lignes) parReseau.set(l.reseau, (parReseau.get(l.reseau) ?? 0) + 1);
  for (const [reseau, n] of [...parReseau].sort()) info(`  ${reseau.padEnd(28)} ${n}`);
  if (sansAdresse.length) {
    info(`FASE inexploitable, ignorées : ${sansAdresse.slice(0, 10).join(", ")}${sansAdresse.length > 10 ? `… (${sansAdresse.length} au total)` : ""}`);
  }
  if (!versStdout) info(`\nFichier écrit : ${path.relative(RACINE, FICHIER)}`);
  info(
    `\n⚠ Boîtes réservées aux communications administratives avec le ministère\n` +
      `  (circulaire 9563) : ne pas les utiliser pour une campagne.`
  );
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
