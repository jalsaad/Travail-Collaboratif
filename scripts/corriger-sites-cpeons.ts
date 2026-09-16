// ---------------------------------------------------------------------------
// scripts/corriger-sites-cpeons.ts
// Correction ponctuelle de 3 sites web écrits avec la valeur brute (cassée)
// que publiait le CPEONS avant que scripts/importer-cpeons.ts ne sache la
// nettoyer (cf. normaliserSite). À supprimer une fois exécuté.
//
//   npm run corriger-sites-cpeons
// ---------------------------------------------------------------------------

import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chargerEnvLocal } from "../lib/env-local";

chargerEnvLocal(path.resolve(__dirname, ".."));
const prisma = new PrismaClient();

const CORRECTIONS: { numeroFase: string; website: string }[] = [
  { numeroFase: "130", website: "https://www.lyceedachsbeck.com/" },
  { numeroFase: "95556", website: "https://ecolejulesverne.brussels/" },
  { numeroFase: "95557", website: "http://www.labmariecurie.brussels" },
];

async function main() {
  for (const { numeroFase, website } of CORRECTIONS) {
    await prisma.fwbSchool.update({ where: { numeroFase }, data: { website } });
    console.log(`  ${numeroFase} -> ${website}`);
  }
  console.log(`${CORRECTIONS.length} site(s) corrigé(s).`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
