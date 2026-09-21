// ---------------------------------------------------------------------------
// scripts/exporter-relance.ts
// Construit data/prospection-relance.csv : les écoles DÉJÀ contactées lors de
// la première campagne, à qui adresser la relance (cf.
// lib/invitation-directions.ts::buildDirectionRelance).
//
//   npm run liste-relance                 # écrit le fichier et résume les écarts
//   npm run liste-relance -- --jours=30   # seulement celles contactées il y a 30 jours ou plus
//
// La liste vient de la base (fwb_schools), pas des CSV de la première
// campagne : le suivi y est reporté à chaque envoi (cf.
// lib/prospection-suivi.ts), il survit donc au poste de travail utilisé à
// l'époque. Rien n'est envoyé ici ; l'envoi reste le fait de
// scripts/inviter-directions.ts, avec son journal et sa simulation.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ecrireCsv, type LigneCsv } from "../lib/prospection-csv";
import { chargerEnvLocal } from "../lib/env-local";

const RACINE = path.resolve(__dirname, "..");
const SORTIE = path.join(RACINE, "data/prospection-relance.csv");

/// Mêmes noms de colonnes que data/prospection-ecoles.csv : le profil de
/// relance de scripts/inviter-directions.ts lit exactement les mêmes clés, il
/// n'y a donc rien à adapter entre les deux campagnes.
const COLONNES = ["email_direction", "nom", "niveau", "code_postal", "ville", "reseau", "numero_fase"];

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NIVEAU_LABEL: Record<string, string> = {
  MATERNELLE: "Maternel",
  PRIMAIRE: "Fondamental",
  SECONDAIRE: "Secondaire",
};

function lireJours(argv: string[]): number | null {
  const trouve = argv.find((a) => a.startsWith("--jours="));
  if (!trouve) return null;
  const valeur = Number(trouve.slice("--jours=".length));
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : null;
}

async function main() {
  chargerEnvLocal(RACINE);
  const jours = lireJours(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    // CONTACTEE et RELANCEE seulement : A_CONTACTER n'a jamais rien reçu (ce
    // serait une première invitation, pas une relance) et REFUS est un refus
    // explicite, qu'aucune campagne ne doit contourner.
    const candidates = await prisma.fwbSchool.findMany({
      where: {
        prospectionStatus: { in: ["CONTACTEE", "RELANCEE"] },
        emailDirection: { not: null },
        ...(jours !== null
          ? { lastContactedAt: { lte: new Date(Date.now() - jours * 24 * 60 * 60 * 1000) } }
          : {}),
      },
      select: {
        numeroFase: true,
        name: true,
        niveaux: true,
        postalCode: true,
        locality: true,
        reseau: true,
        emailDirection: true,
        lastContactedAt: true,
      },
      orderBy: [{ lastContactedAt: "asc" }],
    });

    // Une école qui a depuis rejoint la plateforme — de sa propre initiative ou
    // par ses enseignant·es — n'a rien à faire dans une relance : elle reçoit
    // déjà les emails du service (cf. lib/school-notifications.ts).
    const inscrites = new Set(
      (
        await prisma.school.findMany({
          where: { numeroFase: { not: null } },
          select: { numeroFase: true },
        })
      ).map((e) => e.numeroFase as string)
    );

    const lignes: LigneCsv[] = [];
    const adressesVues = new Set<string>();
    let dejaInscrites = 0;
    let adressesInvalides = 0;
    let doublonsAdresse = 0;

    for (const ecole of candidates) {
      const email = (ecole.emailDirection ?? "").trim().toLowerCase();
      if (inscrites.has(ecole.numeroFase)) {
        dejaInscrites++;
        continue;
      }
      if (!EMAIL_VALIDE.test(email)) {
        adressesInvalides++;
        continue;
      }
      // Une même adresse couvre parfois plusieurs implantations : une seule
      // relance part, sous le nom de la première école rencontrée.
      if (adressesVues.has(email)) {
        doublonsAdresse++;
        continue;
      }
      adressesVues.add(email);

      lignes.push({
        email_direction: email,
        nom: ecole.name,
        niveau: NIVEAU_LABEL[ecole.niveaux[0] ?? ""] ?? "",
        code_postal: ecole.postalCode ?? "",
        ville: ecole.locality ?? "",
        reseau: ecole.reseau,
        numero_fase: ecole.numeroFase,
      });
    }

    fs.writeFileSync(SORTIE, ecrireCsv(COLONNES, lignes), "utf8");

    console.log(`Déjà contactées        : ${candidates.length}${jours !== null ? ` (il y a ${jours} jours ou plus)` : ""}`);
    console.log(`Écartées — inscrites   : ${dejaInscrites}`);
    console.log(`Écartées — adresse     : ${adressesInvalides}`);
    console.log(`Écartées — doublon     : ${doublonsAdresse}`);
    console.log(`À relancer             : ${lignes.length}`);
    console.log(`\nFichier écrit          : ${path.relative(RACINE, SORTIE)}`);
    console.log(`Aperçu de l'email      : npm run invitations -- --profil=relance --apercu`);
    console.log(`Envoi (par lots)       : npm run invitations -- --profil=relance --envoyer --limite=25`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
