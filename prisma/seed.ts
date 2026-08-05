// ---------------------------------------------------------------------------
// prisma/seed.ts
// Jeu de données de démonstration — reprend les mêmes personnes/périodes
// que le prototype cliquable, pour pouvoir brancher l'un sur l'autre.
// Lancer avec : npx prisma db seed
// ---------------------------------------------------------------------------

import {
  PrismaClient,
  Role,
  PeriodType,
  ParticipantStatus,
  AnnouncementStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mot de passe unique pour tous les comptes de démo (dev/local uniquement).
const DEMO_PASSWORD = "demo1234";

async function main() {
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Feature flags ------------------------------------------------------
  // Le service "dons" est modélisé mais reste masqué jusqu'à activation
  // manuelle par un superadmin.
  await prisma.featureFlag.upsert({
    where: { key: "donations" },
    update: {},
    create: { key: "donations", enabled: false },
  });

  // --- Compte plateforme (superadmin) -------------------------------------
  const platformAdmin = await prisma.user.upsert({
    where: { email: "admin@travail-collaboratif.be" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "admin@travail-collaboratif.be",
      firstName: "Super",
      lastName: "Admin",
      isSuperAdmin: true,
      passwordHash: demoPasswordHash,
    },
  });

  // --- Année scolaire -------------------------------------------------
  const schoolYear = await prisma.schoolYear.upsert({
    where: { label: "2025-2026" },
    update: {},
    create: {
      label: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
    },
  });

  // --- Écoles -----------------------------------------------------------
  const tilleuls = await prisma.school.upsert({
    where: { numeroFase: "FASE-0001" },
    update: {},
    create: {
      name: "École Les Tilleuls",
      reseau: "WBE",
      numeroFase: "FASE-0001",
      address: "Rue du Parc 12, 7500 Tournai",
    },
  });

  const val = await prisma.school.upsert({
    where: { numeroFase: "FASE-0002" },
    update: {},
    create: {
      name: "Athénée Provincial du Val",
      reseau: "Officiel subventionné",
      numeroFase: "FASE-0002",
      address: "Avenue du Val 4, 7500 Tournai",
    },
  });

  // --- Utilisateurs -------------------------------------------------------
  const [christine, sophie, marc, amandine, karim, julie, thomas] = await Promise.all([
    prisma.user.upsert({
      where: { email: "c.toumpsin@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "c.toumpsin@ecole-tilleuls.be", firstName: "Christine", lastName: "Toumpsin", passwordHash: demoPasswordHash },
    }),
    prisma.user.upsert({
      where: { email: "s.dubois@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "s.dubois@ecole-tilleuls.be", firstName: "Sophie", lastName: "Dubois", passwordHash: demoPasswordHash },
    }),
    prisma.user.upsert({
      where: { email: "m.lefevre@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "m.lefevre@ecole-tilleuls.be", firstName: "Marc", lastName: "Lefèvre", passwordHash: demoPasswordHash },
    }),
    prisma.user.upsert({
      where: { email: "a.colson@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "a.colson@ecole-tilleuls.be", firstName: "Amandine", lastName: "Colson", passwordHash: demoPasswordHash },
    }),
    prisma.user.upsert({
      where: { email: "k.benali@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "k.benali@ecole-tilleuls.be", firstName: "Karim", lastName: "Benali", passwordHash: demoPasswordHash },
    }),
    prisma.user.upsert({
      where: { email: "j.vandamme@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "j.vandamme@ecole-tilleuls.be", firstName: "Julie", lastName: "Van Damme", passwordHash: demoPasswordHash },
    }),
    prisma.user.upsert({
      where: { email: "t.gregoire@val.be" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "t.gregoire@val.be", firstName: "Thomas", lastName: "Grégoire", passwordHash: demoPasswordHash },
    }),
  ]);

  // --- Memberships (École Les Tilleuls) -----------------------------------
  const memberChristine = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: christine.id, schoolId: tilleuls.id } },
    update: {},
    create: { userId: christine.id, schoolId: tilleuls.id, role: Role.DIRECTION, isAccountOwner: true },
  });

  const memberSophieTilleuls = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: sophie.id, schoolId: tilleuls.id } },
    update: {},
    create: { userId: sophie.id, schoolId: tilleuls.id, role: Role.REFERENT_NUMERIQUE },
  });

  const memberMarc = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: marc.id, schoolId: tilleuls.id } },
    update: {},
    create: { userId: marc.id, schoolId: tilleuls.id, role: Role.ENSEIGNANT },
  });

  const memberAmandine = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: amandine.id, schoolId: tilleuls.id } },
    update: {},
    create: { userId: amandine.id, schoolId: tilleuls.id, role: Role.ENSEIGNANT },
  });

  const memberKarim = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: karim.id, schoolId: tilleuls.id } },
    update: {},
    create: { userId: karim.id, schoolId: tilleuls.id, role: Role.ENSEIGNANT },
  });

  const memberJulie = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: julie.id, schoolId: tilleuls.id } },
    update: {},
    create: { userId: julie.id, schoolId: tilleuls.id, role: Role.ENSEIGNANT },
  });

  // Sophie est aussi enseignante à temps partiel à l'Athénée du Val
  // (cas "enseignant multi-écoles").
  const memberSophieVal = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: sophie.id, schoolId: val.id } },
    update: {},
    create: { userId: sophie.id, schoolId: val.id, role: Role.ENSEIGNANT },
  });

  const memberThomasVal = await prisma.membership.upsert({
    where: { userId_schoolId: { userId: thomas.id, schoolId: val.id } },
    update: {},
    create: { userId: thomas.id, schoolId: val.id, role: Role.ENSEIGNANT },
  });

  // --- Objectifs annuels (ETP → périodes) ---------------------------------
  // Sophie : 0.5 ETP aux Tilleuls + 0.3 ETP au Val = 0.8 ETP au total.
  // 60 * 0.5 = 30 pér. / 60 * 0.3 = 18 pér. → 48 pér. cumulées (cohérent
  // avec le prototype), à vérifier contre le plafond des 2 pér./semaine.
  await prisma.annualAssignment.upsert({
    where: { membershipId_schoolYearId: { membershipId: memberSophieTilleuls.id, schoolYearId: schoolYear.id } },
    update: {},
    create: { membershipId: memberSophieTilleuls.id, schoolYearId: schoolYear.id, etp: 0.5, objectifPeriodes: 30 },
  });
  await prisma.annualAssignment.upsert({
    where: { membershipId_schoolYearId: { membershipId: memberSophieVal.id, schoolYearId: schoolYear.id } },
    update: {},
    create: { membershipId: memberSophieVal.id, schoolYearId: schoolYear.id, etp: 0.3, objectifPeriodes: 18 },
  });

  const fullTimers = [
    { m: memberMarc, etp: 1 },
    { m: memberAmandine, etp: 1 },
    { m: memberJulie, etp: 1 },
  ];
  for (const { m, etp } of fullTimers) {
    await prisma.annualAssignment.upsert({
      where: { membershipId_schoolYearId: { membershipId: m.id, schoolYearId: schoolYear.id } },
      update: {},
      create: { membershipId: m.id, schoolYearId: schoolYear.id, etp, objectifPeriodes: 60 * etp },
    });
  }
  await prisma.annualAssignment.upsert({
    where: { membershipId_schoolYearId: { membershipId: memberKarim.id, schoolYearId: schoolYear.id } },
    update: {},
    create: { membershipId: memberKarim.id, schoolYearId: schoolYear.id, etp: 0.5, objectifPeriodes: 30 },
  });
  await prisma.annualAssignment.upsert({
    where: { membershipId_schoolYearId: { membershipId: memberThomasVal.id, schoolYearId: schoolYear.id } },
    update: {},
    create: { membershipId: memberThomasVal.id, schoolYearId: schoolYear.id, etp: 1, objectifPeriodes: 60 },
  });

  // --- Disciplines -----------------------------------------------------
  // Codes du référentiel FWB (cf. lib/disciplines.ts) : Mathématiques degré
  // inférieur (26) et Français degré supérieur (228) — cohérents avec les
  // niveaux déclarés ci-dessous.
  const [maths, francais] = await Promise.all([
    prisma.discipline.upsert({ where: { code: "26" }, update: {}, create: { code: "26", name: "Mathématiques" } }),
    prisma.discipline.upsert({ where: { code: "228" }, update: {}, create: { code: "228", name: "Français" } }),
  ]);

  // La discipline se rattache désormais à une ligne niveau/heures (pas à la
  // Membership globalement) : on déclare donc un niveau plausible pour
  // rattacher ces deux disciplines de démo.
  await prisma.membershipLevelHours.upsert({
    where: {
      membershipId_level_disciplineId: {
        membershipId: memberSophieTilleuls.id,
        level: "SECONDAIRE_INFERIEUR",
        disciplineId: maths.id,
      },
    },
    update: {},
    create: {
      membershipId: memberSophieTilleuls.id,
      level: "SECONDAIRE_INFERIEUR",
      hours: 11,
      disciplineId: maths.id,
    },
  });
  await prisma.membershipLevelHours.upsert({
    where: {
      membershipId_level_disciplineId: {
        membershipId: memberThomasVal.id,
        level: "SECONDAIRE_SUPERIEUR",
        disciplineId: francais.id,
      },
    },
    update: {},
    create: {
      membershipId: memberThomasVal.id,
      level: "SECONDAIRE_SUPERIEUR",
      hours: 21,
      disciplineId: francais.id,
    },
  });

  // --- Contenu de démo à usage unique --------------------------------------
  // Annonce, code de rattachement et périodes n'ont pas de clé naturelle à
  // upserter ; cette garde évite de les dupliquer (ou de planter sur le
  // code unique) si le seed est rejoué sur une base déjà peuplée.
  const alreadySeeded = (await prisma.collaborativePeriod.count()) > 0;

  if (!alreadySeeded) {
    // --- Annonce plateforme (exemple de ciblage) ---------------------------
    // Vise : tous les profs de maths (tout réseau confondu) OU toute direction
    // de l'école Les Tilleuls.
    await prisma.announcement.create({
      data: {
        title: "Nouvelle ressource pédagogique disponible",
        body: "Un nouveau kit d'activités inter-cycles est disponible pour les enseignants de mathématiques.",
        status: AnnouncementStatus.PUBLISHED,
        publishAt: new Date(),
        createdById: platformAdmin.id,
        targets: {
          create: [
            { role: Role.ENSEIGNANT, disciplineId: maths.id },
            { role: Role.DIRECTION, schoolId: tilleuls.id },
          ],
        },
      },
    });

    // --- Codes de rattachement actifs ----------------------------------------
    await prisma.joinCode.create({
      data: {
        schoolId: tilleuls.id,
        code: "TILL-2026-8K3",
        active: true,
        createdById: christine.id,
      },
    });
    await prisma.joinCode.create({
      data: {
        schoolId: val.id,
        code: "VAL-2026-4F2",
        active: true,
        createdById: thomas.id,
      },
    });

    // --- Périodes de travail collaboratif -----------------------------------

    // p1 — validée, collaboration pédagogique, Sophie + Amandine + Julie
    const p1 = await prisma.collaborativePeriod.create({
      data: {
        type: PeriodType.COLLABORATION_PEDAGOGIQUE,
        date: new Date("2026-06-24"),
        // dureePeriodes doit rester cohérent avec la plage horaire
        // (1 période = 50 min, cf. lib/period-duration.ts).
        heureDebut: "08:30",
        heureFin: "10:10",
        dureePeriodes: 2,
        natureActivite: "preparation-cours-commun",
        description: "Co-construction d'une séquence sur les fractions avec le cycle 4.",
        objectifsPilotage: "Objectif 2 — améliorer les résultats en mathématiques au cycle 4.",
        schoolYearId: schoolYear.id,
        createdByUserId: sophie.id,
        participants: {
          create: [
            { userId: sophie.id, membershipId: memberSophieTilleuls.id, status: ParticipantStatus.CONFIRMED, isInitiator: true, confirmedAt: new Date() },
            { userId: amandine.id, membershipId: memberAmandine.id, status: ParticipantStatus.CONFIRMED, confirmedAt: new Date() },
            { userId: julie.id, membershipId: memberJulie.id, status: ParticipantStatus.CONFIRMED, confirmedAt: new Date() },
          ],
        },
      },
    });

    // p2 — validée, réunion d'équipe, toute l'équipe
    const p2 = await prisma.collaborativePeriod.create({
      data: {
        type: PeriodType.REUNION_EQUIPE,
        date: new Date("2026-06-18"),
        heureDebut: "13:00",
        heureFin: "15:30",
        dureePeriodes: 3,
        natureActivite: "evaluation-contrat",
        description: "Réunion d'équipe — évaluation intermédiaire du contrat d'objectifs.",
        schoolYearId: schoolYear.id,
        createdByUserId: christine.id,
        participants: {
          create: [
            { userId: sophie.id, membershipId: memberSophieTilleuls.id, status: ParticipantStatus.CONFIRMED, confirmedAt: new Date() },
            { userId: marc.id, membershipId: memberMarc.id, status: ParticipantStatus.CONFIRMED, confirmedAt: new Date() },
            { userId: amandine.id, membershipId: memberAmandine.id, status: ParticipantStatus.CONFIRMED, confirmedAt: new Date() },
            { userId: karim.id, membershipId: memberKarim.id, status: ParticipantStatus.CONFIRMED, confirmedAt: new Date() },
          ],
        },
      },
    });

    // p3 — inter-écoles, en attente de confirmation de Thomas (Val)
    const p3 = await prisma.collaborativePeriod.create({
      data: {
        type: PeriodType.COLLABORATION_PEDAGOGIQUE,
        date: new Date("2026-06-10"),
        heureDebut: "10:20",
        heureFin: "11:35",
        dureePeriodes: 1.5,
        natureActivite: "concertation-inter-ecoles",
        description: "Concertation inter-écoles sur l'épreuve commune de français.",
        objectifsPilotage: "Objectif 1 — harmoniser les pratiques d'évaluation en français.",
        schoolYearId: schoolYear.id,
        createdByUserId: sophie.id,
        participants: {
          create: [
            { userId: sophie.id, membershipId: memberSophieTilleuls.id, status: ParticipantStatus.CONFIRMED, isInitiator: true, confirmedAt: new Date() },
            { userId: thomas.id, membershipId: memberThomasVal.id, status: ParticipantStatus.PENDING },
          ],
        },
      },
    });

    // p4 — en attente de la confirmation de Sophie elle-même (coaching par Karim)
    const p4 = await prisma.collaborativePeriod.create({
      data: {
        type: PeriodType.COLLABORATION_PEDAGOGIQUE,
        date: new Date("2026-05-29"),
        heureDebut: "14:00",
        heureFin: "15:40",
        dureePeriodes: 2,
        natureActivite: "accompagnement-debutant",
        description: "Coaching d'une nouvelle collègue sur la gestion de classe.",
        schoolYearId: schoolYear.id,
        createdByUserId: karim.id,
        participants: {
          create: [
            { userId: karim.id, membershipId: memberKarim.id, status: ParticipantStatus.CONFIRMED, isInitiator: true, confirmedAt: new Date() },
            { userId: sophie.id, membershipId: memberSophieTilleuls.id, status: ParticipantStatus.PENDING },
          ],
        },
      },
    });

    console.log("Seed terminé :", {
      ecoles: [tilleuls.name, val.name],
      periodes: [p1.id, p2.id, p3.id, p4.id],
    });
  } else {
    console.log("Périodes/annonce/code de rattachement déjà présents — section ignorée (idempotence).");
  }

  console.log(`Mot de passe de démonstration (tous les comptes) : ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
