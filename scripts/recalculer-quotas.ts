// ---------------------------------------------------------------------------
// scripts/recalculer-quotas.ts
// Recalcule l'ETP et le quota annuel de tous les comptes actifs, sur l'année
// scolaire courante.
//
//   npm run recalculer-quotas             # simulation : montre les écarts
//   npm run recalculer-quotas -- --ecrire # applique
//
// À lancer après toute correction du barème des temps pleins (cf.
// lib/teaching-levels.ts::FULL_TIME_HOURS) : les lignes déjà enregistrées
// gardent sinon l'objectif calculé avec l'ancien barème. Répare aussi les
// comptes sans ligne annuelle — inscrits avant la création de l'année
// scolaire, ils voyaient l'objectif d'un temps plein.
// ---------------------------------------------------------------------------

import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { quotaTargetsFor } from "../lib/quota-rules";
import { chargerEnvLocal } from "../lib/env-local";

const RACINE = path.resolve(__dirname, "..");

async function main() {
  chargerEnvLocal(RACINE);
  const ecrire = process.argv.slice(2).includes("--ecrire");
  const prisma = new PrismaClient();

  try {
    const annee = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
    if (!annee) {
      console.error("Aucune année scolaire en base : rien à recalculer.");
      process.exit(1);
    }
    console.log(`Année scolaire courante : ${annee.label}\n`);

    const memberships = await prisma.membership.findMany({
      where: { status: "ACTIVE" },
      include: {
        levelHours: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        school: { select: { name: true } },
        annualAssignments: { where: { schoolYearId: annee.id } },
      },
    });

    const parUtilisateur = new Map<string, typeof memberships>();
    for (const m of memberships) {
      const liste = parUtilisateur.get(m.userId) ?? [];
      liste.push(m);
      parUtilisateur.set(m.userId, liste);
    }

    let inchanges = 0;
    let corriges = 0;
    let crees = 0;

    for (const liste of parUtilisateur.values()) {
      const cibles = quotaTargetsFor(
        liste.map((m) => ({
          id: m.id,
          levelHours: m.levelHours.map((lh) => ({ level: lh.level, hours: Number(lh.hours) })),
        }))
      );

      for (const cible of cibles) {
        const m = liste.find((x) => x.id === cible.membershipId)!;
        const existant = m.annualAssignments[0];
        const actuel = existant ? Number(existant.objectifPeriodes) : null;
        const qui = `${m.user.firstName} ${m.user.lastName} <${m.user.email}> — ${m.school.name}`;

        if (actuel === null) {
          crees++;
          console.log(`  + ${qui} : aucune ligne → ${cible.objectifPeriodes} périodes (ETP ${cible.etp.toFixed(3)})`);
        } else if (Math.abs(actuel - cible.objectifPeriodes) >= 0.01) {
          corriges++;
          console.log(`  ~ ${qui} : ${actuel} → ${cible.objectifPeriodes} périodes (ETP ${cible.etp.toFixed(3)})`);
        } else {
          inchanges++;
          continue;
        }

        if (ecrire) {
          await prisma.annualAssignment.upsert({
            where: { membershipId_schoolYearId: { membershipId: cible.membershipId, schoolYearId: annee.id } },
            update: { etp: cible.etp, objectifPeriodes: cible.objectifPeriodes },
            create: {
              membershipId: cible.membershipId,
              schoolYearId: annee.id,
              etp: cible.etp,
              objectifPeriodes: cible.objectifPeriodes,
            },
          });
        }
      }
    }

    console.log(`\nInchangés   : ${inchanges}`);
    console.log(`À corriger  : ${corriges}`);
    console.log(`À créer     : ${crees}`);
    console.log(
      ecrire
        ? "\nÉcrit en base."
        : "\nSimulation — rien n'a été écrit. Ajoutez --ecrire pour appliquer."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
