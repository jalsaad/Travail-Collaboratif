// ---------------------------------------------------------------------------
// scripts/purger-comptes-test.ts
// Vide la base de ses comptes de démonstration et de test, en préservant les
// administrateurs de la plateforme.
//
//   npm run purger-test                      # simulation : compte, ne supprime rien
//   npm run purger-test -- --confirmer       # exécute la suppression
//   npm run purger-test -- --sauf=a@b.be,c@d.be
//   npm run purger-test -- --garder-ecoles   # ne supprime que les comptes
//
// Rien n'est supprimé sans --confirmer. Les superadmins sont préservés dans
// tous les cas, sans avoir à les nommer : c'est le drapeau isSuperAdmin en
// base qui fait foi, pas une liste d'adresses tenue à la main.
//
// Sont conservés aussi : les années scolaires, les disciplines et les
// interrupteurs de fonctionnalité — des données de référence, sans lesquelles
// une base vide ne permettrait plus de déclarer quoi que ce soit.
// ---------------------------------------------------------------------------

import path from "node:path";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";
import { chargerEnvLocal } from "../lib/env-local";

chargerEnvLocal(path.resolve(__dirname, ".."));

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const confirmer = args.includes("--confirmer");
const garderEcoles = args.includes("--garder-ecoles");
const sauf = (args.find((a) => a.startsWith("--sauf="))?.split("=")[1] ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  const tous = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
    orderBy: { email: "asc" },
  });

  const preserves = tous.filter((u) => u.isSuperAdmin || sauf.includes(u.email.toLowerCase()));
  const condamnes = tous.filter((u) => !preserves.some((p) => p.id === u.id));
  const idsCondamnes = condamnes.map((u) => u.id);

  if (preserves.length === 0) {
    console.error(
      "Aucun compte ne serait préservé : aucun superadmin en base, et --sauf ne " +
        "désigne personne. Refus de tout supprimer.\n" +
        "Vérifiez la base avant de relancer."
    );
    process.exitCode = 1;
    return;
  }

  const ecolesAvantPurge = await prisma.school.count();
  const [periodes, tickets, annonces, invitations, journal] = await Promise.all([
    prisma.collaborativePeriod.count({ where: { createdByUserId: { in: idsCondamnes } } }),
    prisma.supportTicket.count({ where: { userId: { in: idsCondamnes } } }),
    prisma.announcement.count({ where: { createdById: { in: idsCondamnes } } }),
    prisma.invitation.count({ where: { invitedById: { in: idsCondamnes } } }),
    prisma.auditLog.count({ where: { actorId: { in: idsCondamnes } } }),
  ]);

  console.log("\nComptes PRÉSERVÉS");
  for (const u of preserves) {
    console.log(
      `  ${u.email.padEnd(38)} ${u.firstName} ${u.lastName}` +
        (u.isSuperAdmin ? "  [admin plateforme]" : "  [--sauf]")
    );
  }

  console.log(`\nComptes SUPPRIMÉS — ${condamnes.length}`);
  for (const u of condamnes.slice(0, 30)) {
    console.log(`  ${u.email.padEnd(38)} ${u.firstName} ${u.lastName}`);
  }
  if (condamnes.length > 30) console.log(`  … et ${condamnes.length - 30} autres`);

  console.log("\nDonnées emportées");
  console.log(`  périodes déclarées      ${periodes}`);
  console.log(`  tickets d'assistance    ${tickets}`);
  console.log(`  annonces                ${annonces}`);
  console.log(`  invitations             ${invitations}`);
  console.log(`  entrées de journal      ${journal}`);
  console.log(`  écoles                  ${garderEcoles ? "conservées" : ecolesAvantPurge}`);

  if (condamnes.length === 0) {
    console.log("\nRien à supprimer.");
    return;
  }

  if (!confirmer) {
    console.log("\nSimulation : rien n'a été supprimé. Relancez avec --confirmer.");
    return;
  }

  await demanderConfirmation(condamnes.length);

  // Ordre imposé par le schéma : périodes, journal, invitations, annonces et
  // exports pointent vers un utilisateur SANS suppression en cascade (cf.
  // prisma/schema.prisma) — les effacer d'abord, sinon la base refuse.
  // Le reste (rattachements, participations, jetons, tickets) part en cascade
  // avec le compte, et les écoles emportent leurs propres dépendances.
  await prisma.$transaction(async (tx) => {
    await tx.collaborativePeriod.deleteMany({ where: { createdByUserId: { in: idsCondamnes } } });
    await tx.auditLog.deleteMany({ where: { actorId: { in: idsCondamnes } } });
    await tx.invitation.deleteMany({ where: { invitedById: { in: idsCondamnes } } });
    await tx.exportLog.deleteMany({ where: { requestedById: { in: idsCondamnes } } });
    await tx.announcement.deleteMany({ where: { createdById: { in: idsCondamnes } } });
    await tx.user.deleteMany({ where: { id: { in: idsCondamnes } } });

    if (!garderEcoles) {
      // Une école sans membre n'est plus administrable par personne : elle
      // n'aurait plus aucun moyen d'être reprise en main.
      await tx.school.deleteMany({ where: { memberships: { none: {} } } });
    }
  });

  const restants = await prisma.user.count();
  const ecoles = await prisma.school.count();
  console.log(`\nTerminé. ${restants} compte(s) et ${ecoles} école(s) en base.`);
}

/// Deuxième garde-fou, en plus de --confirmer : la commande peut être collée
/// sur le mauvais serveur, et il n'y a pas de retour en arrière.
function demanderConfirmation(nombre: number): Promise<void> {
  if (!process.stdin.isTTY) return Promise.resolve(); // exécution non interactive assumée
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    rl.question(`\nSupprimer définitivement ${nombre} compte(s) ? Tapez SUPPRIMER : `, (reponse) => {
      rl.close();
      if (reponse.trim() === "SUPPRIMER") resolve();
      else reject(new Error("Annulé : rien n'a été supprimé."));
    });
  });
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
