// ---------------------------------------------------------------------------
// scripts/creer-demo.ts
// Crée (ou remet à niveau) l'école de démonstration ouverte aux directions qui
// découvrent la plateforme, et le compte partagé qui permet d'y entrer.
//
//   npm run demo
//
// Idempotent : relançable sans créer de doublon. Le compte est marqué
// `isDemo`, ce qui lui interdit toute écriture (cf. lib/prisma.ts) — l'espace
// reste donc identique pour chaque visiteur, sans remise à zéro périodique.
//
// L'école n'a délibérément PAS de numéro FASE : elle ne correspond à aucun
// établissement réel et n'apparaît donc pas sur la cartographie.
// ---------------------------------------------------------------------------

import {
  PrismaClient,
  Role,
  PeriodType,
  ParticipantStatus,
  type TeachingLevel,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_EMAIL, DEMO_PASSWORD as DEMO_PASSWORD_DEFAUT } from "../lib/demo-mode";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAUT;
const SCHOOL_NAME = "Athénée Royal de la Démonstration";

/// 1 période = 50 minutes (cf. lib/period-duration.ts).
function periodes(de: string, a: string): number {
  const [dh, dm] = de.split(":").map(Number);
  const [ah, am] = a.split(":").map(Number);
  return Math.round(((ah * 60 + am - (dh * 60 + dm)) / 50) * 2) / 2;
}

type Profil = {
  prenom: string;
  nom: string;
  role: Role;
  etp: number;
  /// Niveau et discipline déclarés, qui alimentent l'ETP affiché.
  niveau: TeachingLevel;
  discipline: string;
};

const PROFILS: Profil[] = [
  { prenom: "Claire", nom: "Vermeulen", role: Role.DIRECTION, etp: 1, niveau: "SECONDAIRE_SUPERIEUR", discipline: "Direction" },
  { prenom: "Camille", nom: "Deprez", role: Role.REFERENT_NUMERIQUE, etp: 1, niveau: "SECONDAIRE_INFERIEUR", discipline: "Sciences" },
  { prenom: "Amina", nom: "Benali", role: Role.ENSEIGNANT, etp: 1, niveau: "SECONDAIRE_INFERIEUR", discipline: "Mathématiques" },
  { prenom: "Marc", nom: "Lejeune", role: Role.ENSEIGNANT, etp: 0.5, niveau: "SECONDAIRE_SUPERIEUR", discipline: "Histoire" },
  { prenom: "Julie", nom: "Moreau", role: Role.ENSEIGNANT, etp: 0.8, niveau: "SECONDAIRE_INFERIEUR", discipline: "Français" },
  { prenom: "Thomas", nom: "Wauters", role: Role.ENSEIGNANT, etp: 1, niveau: "SECONDAIRE_SUPERIEUR", discipline: "Éducation physique" },
  { prenom: "Sophie", nom: "Dubois", role: Role.ENSEIGNANT, etp: 0.6, niveau: "SECONDAIRE_INFERIEUR", discipline: "Néerlandais" },
];

function emailDe(p: Profil): string {
  return `${p.prenom[0].toLowerCase()}.${p.nom.toLowerCase().replace(/[^a-z]/g, "")}@demo.travail-collaboratif.be`;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Année scolaire : celle déjà ouverte, sinon rien à afficher ---------
  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  if (!schoolYear) {
    throw new Error("Aucune année scolaire en base : créez-la avant de monter la démo.");
  }

  // --- École --------------------------------------------------------------
  const existante = await prisma.school.findFirst({ where: { name: SCHOOL_NAME } });
  const school = existante
    ? await prisma.school.update({ where: { id: existante.id }, data: { status: "APPROVED" } })
    : await prisma.school.create({
        data: {
          name: SCHOOL_NAME,
          reseau: "Officiel (WBE)",
          region: "Namur (Zone 6)",
          niveaux: ["SECONDAIRE"],
          typesEnseignement: ["ORDINAIRE"],
          address: "Rue de l'Enseignement 14",
          postalCode: "5000",
          locality: "Namur",
          phone: "081 00 00 00",
          status: "APPROVED",
        },
      });

  // --- Code de rattachement ----------------------------------------------
  const codeExistant = await prisma.joinCode.findFirst({ where: { schoolId: school.id, active: true } });
  if (!codeExistant) {
    await prisma.joinCode.create({
      data: { schoolId: school.id, code: "DEMO-2026-TC1", active: true, createdById: "seed" },
    });
  }

  // --- Comptes et rattachements ------------------------------------------
  const memberships = new Map<string, string>();

  for (const profil of PROFILS) {
    const estDirection = profil.role === Role.DIRECTION;
    const email = estDirection ? DEMO_EMAIL : emailDe(profil);

    const user = await prisma.user.upsert({
      where: { email },
      // Le mot de passe est remis à niveau à chaque exécution : c'est ainsi
      // qu'on le fait tourner sans toucher au reste de la démo.
      update: { isDemo: true, passwordHash },
      create: {
        email,
        firstName: profil.prenom,
        lastName: profil.nom,
        passwordHash,
        sex: ["Claire", "Camille", "Amina", "Julie", "Sophie"].includes(profil.prenom) ? "F" : "M",
        // Tous les comptes de l'école sont en démonstration : même si l'un
        // d'eux servait un jour à se connecter, il n'écrirait rien.
        isDemo: true,
      },
    });

    const membership = await prisma.membership.upsert({
      where: { userId_schoolId: { userId: user.id, schoolId: school.id } },
      update: { role: profil.role, status: "ACTIVE" },
      create: {
        userId: user.id,
        schoolId: school.id,
        role: profil.role,
        status: "ACTIVE",
        isAccountOwner: estDirection,
        fonction: estDirection ? "Direction" : null,
      },
    });
    memberships.set(profil.nom, membership.id);

    // Discipline et heures déclarées — support de l'ETP affiché.
    let discipline = await prisma.discipline.findFirst({ where: { name: profil.discipline } });
    if (!discipline) {
      discipline = await prisma.discipline.create({ data: { name: profil.discipline } });
    }
    await prisma.membershipLevelHours.upsert({
      where: {
        membershipId_level_disciplineId: {
          membershipId: membership.id,
          level: profil.niveau,
          disciplineId: discipline.id,
        },
      },
      update: { hours: profil.etp * 20 },
      create: {
        membershipId: membership.id,
        level: profil.niveau,
        disciplineId: discipline.id,
        hours: profil.etp * 20,
      },
    });

    await prisma.annualAssignment.upsert({
      where: { membershipId_schoolYearId: { membershipId: membership.id, schoolYearId: schoolYear.id } },
      update: { etp: profil.etp, objectifPeriodes: 60 * profil.etp },
      create: {
        membershipId: membership.id,
        schoolYearId: schoolYear.id,
        etp: profil.etp,
        objectifPeriodes: 60 * profil.etp,
      },
    });
  }

  // --- Périodes de travail collaboratif -----------------------------------
  // Un panachage volontaire : des périodes validées et d'autres en attente,
  // pour que la direction voie les deux états et l'écart entre enseignants.
  const idDe = (nom: string) => memberships.get(nom)!;
  const userIdDe = async (membershipId: string) =>
    (await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } })).userId;

  const periodesADeclarer = [
    {
      type: PeriodType.REUNION_EQUIPE,
      date: "2025-12-12",
      de: "16:00",
      a: "17:40",
      description: "Conseil de classe — 4e année",
      participants: [
        { nom: "Benali", statut: ParticipantStatus.CONFIRMED, initiateur: true },
        { nom: "Lejeune", statut: ParticipantStatus.CONFIRMED },
        { nom: "Moreau", statut: ParticipantStatus.CONFIRMED },
      ],
    },
    {
      type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      date: "2025-12-08",
      de: "14:00",
      a: "15:15",
      description: "Préparation du projet interdisciplinaire sciences-histoire",
      participants: [
        { nom: "Deprez", statut: ParticipantStatus.CONFIRMED, initiateur: true },
        { nom: "Wauters", statut: ParticipantStatus.PENDING },
      ],
    },
    {
      type: PeriodType.COLLABORATION_PEDAGOGIQUE,
      date: "2025-12-02",
      de: "11:00",
      a: "11:50",
      description: "Concertation avec le centre PMS — suivi d'élèves",
      participants: [{ nom: "Moreau", statut: ParticipantStatus.CONFIRMED, initiateur: true }],
    },
    {
      type: PeriodType.REUNION_EQUIPE,
      date: "2025-11-21",
      de: "16:00",
      a: "17:40",
      description: "Réunion de l'équipe éducative — remédiation",
      participants: [
        { nom: "Benali", statut: ParticipantStatus.CONFIRMED, initiateur: true },
        { nom: "Dubois", statut: ParticipantStatus.CONFIRMED },
        { nom: "Lejeune", statut: ParticipantStatus.PENDING },
      ],
    },
  ];

  for (const p of periodesADeclarer) {
    const deja = await prisma.collaborativePeriod.findFirst({
      where: { description: p.description, schoolYearId: schoolYear.id },
    });
    if (deja) continue;

    const initiateur = p.participants.find((x) => x.initiateur) ?? p.participants[0];
    const createdByUserId = await userIdDe(idDe(initiateur.nom));

    await prisma.collaborativePeriod.create({
      data: {
        type: p.type,
        date: new Date(p.date),
        heureDebut: p.de,
        heureFin: p.a,
        dureePeriodes: periodes(p.de, p.a),
        description: p.description,
        schoolYearId: schoolYear.id,
        createdByUserId,
        participants: {
          create: await Promise.all(
            p.participants.map(async (part) => ({
              userId: await userIdDe(idDe(part.nom)),
              membershipId: idDe(part.nom),
              status: part.statut,
              isInitiator: part.initiateur === true,
              confirmedAt: part.statut === ParticipantStatus.CONFIRMED ? new Date(p.date) : null,
            }))
          ),
        },
      },
    });
  }

  console.log("École de démonstration prête.");
  console.log(`  École      : ${SCHOOL_NAME} (${school.id})`);
  console.log(`  Connexion  : ${DEMO_EMAIL}`);
  console.log(`  Mot de passe : ${DEMO_PASSWORD}`);
  console.log(`  Membres    : ${PROFILS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
