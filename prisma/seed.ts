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
  type TeachingLevel,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mot de passe unique pour tous les comptes de démo (dev/local uniquement).
const DEMO_PASSWORD = "demo1234";

/// Minutes entre deux heures "HH:MM" — la durée en périodes s'en déduit
/// (1 période = 50 minutes, cf. lib/period-duration.ts), plutôt que d'être
/// recopiée à la main sur chaque ligne au risque d'incohérences.
function minutesEntre(de: string, a: string): number {
  const [dh, dm] = de.split(":").map(Number);
  const [ah, am] = a.split(":").map(Number);
  return ah * 60 + am - (dh * 60 + dm);
}

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
      // Calendrier FWB : dernier lundi d'août -> premier vendredi de juillet.
      startDate: new Date("2025-08-25"),
      endDate: new Date("2026-07-03"),
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
  // Identités complètes (date de naissance, sexe, matricule) : sans elles, le
  // bloc d'identité des relevés PDF affiche « non renseigné » partout, ce qui
  // rend le jeu de démonstration inutilisable pour une capture d'écran ou une
  // vidéo. Les matricules respectent la composition de lib/matricule.ts —
  // 1 chiffre sexe, 2 décennie, 2 mois, 2 jour, 4 chiffres libres.
  const [christine, sophie, marc, amandine, karim, julie, thomas] = await Promise.all([
    prisma.user.upsert({
      where: { email: "c.toumpsin@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1972-03-14"), sex: "F", matricule: "27203140142" },
      create: { email: "c.toumpsin@ecole-tilleuls.be", firstName: "Christine", lastName: "Toumpsin", passwordHash: demoPasswordHash, dateOfBirth: new Date("1972-03-14"), sex: "F", matricule: "27203140142" },
    }),
    prisma.user.upsert({
      where: { email: "s.dubois@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1985-09-02"), sex: "F", matricule: "28509020317" },
      create: { email: "s.dubois@ecole-tilleuls.be", firstName: "Sophie", lastName: "Dubois", passwordHash: demoPasswordHash, dateOfBirth: new Date("1985-09-02"), sex: "F", matricule: "28509020317" },
    }),
    prisma.user.upsert({
      where: { email: "m.lefevre@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1978-11-23"), sex: "M", matricule: "17811230884" },
      create: { email: "m.lefevre@ecole-tilleuls.be", firstName: "Marc", lastName: "Lefèvre", passwordHash: demoPasswordHash, dateOfBirth: new Date("1978-11-23"), sex: "M", matricule: "17811230884" },
    }),
    prisma.user.upsert({
      where: { email: "a.colson@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1990-05-08"), sex: "F", matricule: "29005080261" },
      create: { email: "a.colson@ecole-tilleuls.be", firstName: "Amandine", lastName: "Colson", passwordHash: demoPasswordHash, dateOfBirth: new Date("1990-05-08"), sex: "F", matricule: "29005080261" },
    }),
    prisma.user.upsert({
      where: { email: "k.benali@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1983-07-19"), sex: "M", matricule: "18307190475" },
      create: { email: "k.benali@ecole-tilleuls.be", firstName: "Karim", lastName: "Benali", passwordHash: demoPasswordHash, dateOfBirth: new Date("1983-07-19"), sex: "M", matricule: "18307190475" },
    }),
    prisma.user.upsert({
      where: { email: "j.vandamme@ecole-tilleuls.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1995-01-30"), sex: "F", matricule: "29501300639" },
      create: { email: "j.vandamme@ecole-tilleuls.be", firstName: "Julie", lastName: "Van Damme", passwordHash: demoPasswordHash, dateOfBirth: new Date("1995-01-30"), sex: "F", matricule: "29501300639" },
    }),
    prisma.user.upsert({
      where: { email: "t.gregoire@val.be" },
      update: { passwordHash: demoPasswordHash, dateOfBirth: new Date("1988-04-11"), sex: "M", matricule: "18804110752" },
      create: { email: "t.gregoire@val.be", firstName: "Thomas", lastName: "Grégoire", passwordHash: demoPasswordHash, dateOfBirth: new Date("1988-04-11"), sex: "M", matricule: "18804110752" },
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
  const [maths, francais, sciences, histoire, instituteur] = await Promise.all([
    prisma.discipline.upsert({ where: { code: "26" }, update: {}, create: { code: "26", name: "Mathématiques" } }),
    prisma.discipline.upsert({ where: { code: "228" }, update: {}, create: { code: "228", name: "Français" } }),
    prisma.discipline.upsert({ where: { code: "30" }, update: {}, create: { code: "30", name: "Sciences" } }),
    prisma.discipline.upsert({ where: { code: "23" }, update: {}, create: { code: "23", name: "Histoire" } }),
    prisma.discipline.upsert({
      where: { code: "951" },
      update: {},
      create: { code: "951", name: "Instituteur·rice primaire" },
    }),
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

  // Charges des autres enseignant·es, alignées sur les ETP déclarés plus haut
  // (cf. FULL_TIME_HOURS dans lib/teaching-levels.ts : 24 h en primaire, 22 h
  // en secondaire inférieur, 21 h en supérieur). Sans elles, le bloc
  // d'identité des relevés affiche « non renseigné ».
  const charges: { membershipId: string; level: TeachingLevel; hours: number; disciplineId: string }[] = [
    { membershipId: memberMarc.id, level: "SECONDAIRE_INFERIEUR", hours: 22, disciplineId: sciences.id },
    { membershipId: memberAmandine.id, level: "PRIMAIRE", hours: 24, disciplineId: instituteur.id },
    { membershipId: memberJulie.id, level: "SECONDAIRE_INFERIEUR", hours: 22, disciplineId: histoire.id },
    // Karim est à mi-temps (etp 0,5) : 11 h sur les 22 d'un temps plein.
    { membershipId: memberKarim.id, level: "SECONDAIRE_INFERIEUR", hours: 11, disciplineId: francais.id },
    // Sophie enseigne aussi au Val, à 0,3 ETP : 6,3 h sur les 21 du supérieur.
    { membershipId: memberSophieVal.id, level: "SECONDAIRE_SUPERIEUR", hours: 6.3, disciplineId: maths.id },
  ];
  for (const charge of charges) {
    await prisma.membershipLevelHours.upsert({
      where: {
        membershipId_level_disciplineId: {
          membershipId: charge.membershipId,
          level: charge.level,
          disciplineId: charge.disciplineId,
        },
      },
      update: { hours: charge.hours },
      create: charge,
    });
  }

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

  // --- Trois mois de périodes pour la démonstration ------------------------
  // Avril à juin 2026, à l'intérieur de l'année scolaire créée plus haut :
  // de quoi remplir les compteurs, illustrer les deux formes, les natures
  // d'activité, les statuts de validation et le cas inter-écoles — matière à
  // captures d'écran et à une vidéo de prise en main.
  //
  // Identifiants déterministes et upsert : rejouer le seed ne fait pas de
  // doublons et ne touche pas aux périodes créées à la main dans l'interface,
  // dont les identifiants sont aléatoires.
  type DemoPeriode = {
    id: string;
    date: string;
    de: string;
    a: string;
    type: PeriodType;
    nature: string | null;
    description: string;
    objectifs?: string;
    auteur: { userId: string; membershipId: string };
    invites: { userId: string; membershipId: string; statut: ParticipantStatus }[];
  };

  const A = { userId: amandine.id, membershipId: memberAmandine.id };
  const J = { userId: julie.id, membershipId: memberJulie.id };
  const K = { userId: karim.id, membershipId: memberKarim.id };
  const M = { userId: marc.id, membershipId: memberMarc.id };
  const S = { userId: sophie.id, membershipId: memberSophieTilleuls.id };
  const SV = { userId: sophie.id, membershipId: memberSophieVal.id };
  const T = { userId: thomas.id, membershipId: memberThomasVal.id };
  const C = { userId: christine.id, membershipId: memberChristine.id };
  const OK = ParticipantStatus.CONFIRMED;
  const ATT = ParticipantStatus.PENDING;

  const demoPeriodes: DemoPeriode[] = [
    // ---- Avril 2026 ----
    { id: "seed-2026-04-02-a", date: "2026-04-02", de: "08:30", a: "10:10", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "preparation-cours-commun", description: "Préparation commune de la séquence sur les équations du premier degré.",
      objectifs: "Objectif 2 — relever les résultats en mathématiques au degré inférieur.",
      auteur: M, invites: [{ ...M, statut: OK }, { ...S, statut: OK }] },
    { id: "seed-2026-04-09-a", date: "2026-04-09", de: "13:00", a: "15:30", type: PeriodType.REUNION_EQUIPE,
      nature: "contrat-objectifs", description: "Réunion d'équipe — point d'étape sur la mise en œuvre du contrat d'objectifs.",
      objectifs: "Toutes stratégies du contrat d'objectifs.",
      auteur: C, invites: [{ ...C, statut: OK }, { ...M, statut: OK }, { ...A, statut: OK }, { ...J, statut: OK }, { ...K, statut: OK }] },
    { id: "seed-2026-04-16-a", date: "2026-04-16", de: "10:20", a: "11:35", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "pratiques-evaluation", description: "Harmonisation des critères de correction de l'épreuve commune de français.",
      auteur: K, invites: [{ ...K, statut: OK }, { ...J, statut: OK }] },
    { id: "seed-2026-04-23-a", date: "2026-04-23", de: "14:00", a: "15:40", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "accompagnement-debutant", description: "Accompagnement d'une collègue débutante : gestion de classe et rythmes.",
      auteur: A, invites: [{ ...A, statut: OK }, { ...J, statut: OK }] },
    { id: "seed-2026-04-30-a", date: "2026-04-30", de: "09:00", a: "10:00", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "concertation-verticale", description: "Concertation verticale primaire / secondaire sur la continuité en lecture.",
      objectifs: "Objectif 1 — continuité des apprentissages entre cycles.",
      auteur: A, invites: [{ ...A, statut: OK }, { ...M, statut: ATT }] },

    // ---- Mai 2026 ----
    { id: "seed-2026-05-07-a", date: "2026-05-07", de: "08:30", a: "10:10", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "co-construction-activite", description: "Co-construction de la semaine de la citoyenneté.",
      objectifs: "Objectif 3 — climat scolaire et citoyenneté.",
      auteur: J, invites: [{ ...J, statut: OK }, { ...A, statut: OK }, { ...K, statut: OK }] },
    { id: "seed-2026-05-12-a", date: "2026-05-12", de: "13:00", a: "14:40", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "sortie-pedagogique", description: "Conception de la sortie au musée des sciences : parcours et exploitation en classe.",
      auteur: M, invites: [{ ...M, statut: OK }, { ...A, statut: OK }] },
    { id: "seed-2026-05-19-a", date: "2026-05-19", de: "15:00", a: "16:15", type: PeriodType.REUNION_EQUIPE,
      nature: "reunion-equipe-educative", description: "Réunion d'équipe éducative — suivi des élèves en difficulté.",
      auteur: C, invites: [{ ...C, statut: OK }, { ...M, statut: OK }, { ...J, statut: OK }, { ...K, statut: ATT }] },
    { id: "seed-2026-05-21-a", date: "2026-05-21", de: "10:20", a: "12:00", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "concertation-inter-ecoles", description: "Concertation inter-écoles sur l'épreuve externe de français.",
      objectifs: "Objectif 1 — harmoniser les pratiques d'évaluation.",
      auteur: S, invites: [{ ...S, statut: OK }, { ...T, statut: OK }] },
    { id: "seed-2026-05-28-a", date: "2026-05-28", de: "09:00", a: "10:40", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "intervision", description: "Intervision : analyse de situations de classe rencontrées ce trimestre.",
      auteur: K, invites: [{ ...K, statut: OK }, { ...M, statut: OK }, { ...A, statut: ATT }] },

    // ---- Juin 2026 ----
    { id: "seed-2026-06-04-a", date: "2026-06-04", de: "08:30", a: "09:20", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "remediation-depassement", description: "Organisation de la remédiation en mathématiques avant les épreuves.",
      auteur: M, invites: [{ ...M, statut: OK }, { ...K, statut: OK }] },
    { id: "seed-2026-06-09-a", date: "2026-06-09", de: "13:30", a: "15:10", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "dacce", description: "Renseignement du dossier d'accompagnement de l'élève pour trois situations.",
      auteur: J, invites: [{ ...J, statut: OK }, { ...A, statut: OK }] },
    { id: "seed-2026-06-11-a", date: "2026-06-11", de: "10:00", a: "11:40", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "concertation-inter-ecoles", description: "Préparation conjointe de la passation des épreuves certificatives.",
      auteur: SV, invites: [{ ...SV, statut: OK }, { ...T, statut: ATT }] },
    { id: "seed-2026-06-16-a", date: "2026-06-16", de: "14:00", a: "16:30", type: PeriodType.REUNION_EQUIPE,
      nature: "evaluation-contrat", description: "Évaluation annuelle du contrat d'objectifs par l'équipe éducative.",
      objectifs: "Auto-évaluation collective, toutes stratégies.",
      auteur: C, invites: [{ ...C, statut: OK }, { ...M, statut: OK }, { ...A, statut: OK }, { ...J, statut: OK }, { ...K, statut: OK }, { ...S, statut: OK }] },
    { id: "seed-2026-06-23-a", date: "2026-06-23", de: "09:00", a: "10:40", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "numerique", description: "Prise en main d'un outil de quiz interactif et partage de séquences.",
      auteur: S, invites: [{ ...S, statut: OK }, { ...J, statut: OK }, { ...M, statut: ATT }] },
    { id: "seed-2026-06-26-a", date: "2026-06-26", de: "11:00", a: "12:15", type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      nature: "plan-pilotage", description: "Relecture collective des indicateurs du plan de pilotage avant clôture.",
      objectifs: "Préparation de l'évaluation intermédiaire.",
      auteur: A, invites: [{ ...A, statut: OK }, { ...C, statut: OK }] },
  ];

  for (const p of demoPeriodes) {
    const dureePeriodes = minutesEntre(p.de, p.a) / 50;
    await prisma.collaborativePeriod.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        type: p.type,
        date: new Date(p.date),
        heureDebut: p.de,
        heureFin: p.a,
        dureePeriodes,
        natureActivite: p.nature,
        description: p.description,
        objectifsPilotage: p.objectifs ?? null,
        schoolYearId: schoolYear.id,
        createdByUserId: p.auteur.userId,
        participants: {
          create: p.invites.map((i) => ({
            userId: i.userId,
            membershipId: i.membershipId,
            status: i.statut,
            isInitiator: i.userId === p.auteur.userId && i.membershipId === p.auteur.membershipId,
            confirmedAt: i.statut === ParticipantStatus.CONFIRMED ? new Date(p.date) : null,
          })),
        },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
