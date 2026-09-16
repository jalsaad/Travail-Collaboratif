// ---------------------------------------------------------------------------
// scripts/exporter-fwb-schools.ts
// Exporte de l'annuaire (fwb_schools) un CSV de prospection : toutes les
// écoles qui ont à la fois un téléphone et un email, quel que soit leur statut
// de prospection — une école déjà contactée une première fois reste une cible
// valide pour une relance ou une autre campagne.
//
//   npm run exporter-fwb                        # data/prospection-toutes-ecoles.csv
//   npm run exporter-fwb -- --fichier=chemin.csv
//   npm run exporter-fwb -- --stdout            # le CSV sur la sortie standard,
//                                                # rien n'est écrit sur le disque
//                                                # (pour un rapatriement direct par
//                                                # ssh, sans laisser de fichier sur
//                                                # le serveur)
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
  path.join(RACINE, "data/prospection-toutes-ecoles.csv");

// En mode --stdout, la sortie standard ne doit contenir que le CSV : tout le
// reste (progression, bilan) part sur la sortie d'erreur, que le shell
// n'inclut pas dans la redirection `> fichier.csv`.
const info = versStdout ? console.error : console.log;

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const COLONNES = [
  "nom", "reseau", "niveaux", "types_enseignement", "adresse", "code_postal", "localite",
  "commune", "bassin", "telephone", "email_direction", "site_web", "statut_prospection",
  "dernier_contact", "po_nom", "po_email", "numero_fase",
] as const;

const LIBELLES_STATUT: Record<string, string> = {
  A_CONTACTER: "à contacter",
  CONTACTEE: "contactée",
  RELANCEE: "relancée",
  REFUS: "refus",
};

async function main() {
  const ecoles = await prisma.fwbSchool.findMany({
    orderBy: [{ postalCode: "asc" }, { name: "asc" }],
  });

  const retenues = ecoles.filter(
    (e) => (e.phone ?? "").trim() !== "" && EMAIL_VALIDE.test(e.emailDirection ?? "")
  );

  const lignes: LigneCsv[] = retenues.map((e) => ({
    nom: e.name,
    reseau: e.reseau,
    niveaux: e.niveaux.join(", "),
    types_enseignement: e.typesEnseignement.join(", "),
    adresse: e.address ?? "",
    code_postal: e.postalCode ?? "",
    localite: e.locality ?? "",
    commune: e.commune ?? "",
    bassin: e.bassin ?? "",
    telephone: e.phone ?? "",
    email_direction: e.emailDirection ?? "",
    site_web: e.website ?? "",
    statut_prospection: LIBELLES_STATUT[e.prospectionStatus] ?? e.prospectionStatus,
    dernier_contact: e.lastContactedAt ? e.lastContactedAt.toISOString().slice(0, 10) : "",
    po_nom: e.poName ?? "",
    po_email: e.poEmail ?? "",
    numero_fase: e.numeroFase,
  }));

  const csv = ecrireCsv([...COLONNES], lignes);
  if (versStdout) process.stdout.write(csv);
  else fs.writeFileSync(FICHIER, csv, "utf8");

  info(`Écoles au total dans l'annuaire : ${ecoles.length}`);
  info(`Avec téléphone + email valide   : ${retenues.length}`);
  info(`  dont déjà contactées/relancées : ${retenues.filter((e) => e.prospectionStatus !== "A_CONTACTER").length}`);
  if (!versStdout) info(`\nFichier écrit : ${path.relative(RACINE, FICHIER)}`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
