import bcrypt from "bcryptjs";
import { z } from "zod";
import { computeMatricule, MATRICULE_MANUAL_PATTERN } from "@/lib/matricule";
import { resolveOrCreateDiscipline } from "@/lib/discipline-form";
import type { LevelHoursEntry } from "@/lib/teaching-levels";
import type { AppTransactionClient } from "@/lib/prisma";

// Champs d'identité communs aux parcours d'auto-inscription enseignant : par
// code de rattachement (app/(auth)/rejoindre/actions.ts) et par lien de
// parrainage (app/(auth)/rejoindre/parrainage/[token]/actions.ts). Seul
// change ce qui détermine l'école (code saisi vs jeton de parrainage), jamais
// la façon de créer le compte lui-même.
export const teacherIdentitySchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    dateOfBirth: z.string().min(1, "Date de naissance requise"),
    sex: z.enum(["M", "F"], { message: "Sexe requis" }),
    matriculeManual: z
      .string()
      .regex(MATRICULE_MANUAL_PATTERN, "4 chiffres requis pour le numéro de matricule"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    passwordConfirmation: z.string().min(8, "8 caractères minimum"),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type TeacherIdentity = z.infer<typeof teacherIdentitySchema>;

// Crée le compte, la Membership ENSEIGNANT et ses niveaux/heures — le coeur
// partagé des deux parcours d'auto-inscription. Le rôle est toujours
// ENSEIGNANT : ni le code de rattachement ni le parrainage n'attribuent
// jamais DIRECTION/REFERENT_NUMERIQUE (réservé au fondateur de l'école ou à
// une promotion ultérieure, cf. permissions.md).
export async function createTeacherAccountAndMembership(
  tx: AppTransactionClient,
  params: {
    schoolId: string;
    identity: TeacherIdentity;
    levels: LevelHoursEntry[];
    /// Obligatoire, et non facultatif : aucun parcours d'inscription ne doit
    /// pouvoir créer un compte sans avoir vérifié la prise de connaissance de
    /// la politique de confidentialité. Un appelant qui l'oublie ne compile
    /// pas (cf. lib/privacy-policy.ts).
    privacy: { privacyAcceptedAt: Date; privacyPolicyVersion: string };
  }
) {
  const passwordHash = await bcrypt.hash(params.identity.password, 10);
  const matricule = computeMatricule(
    params.identity.sex,
    params.identity.dateOfBirth,
    params.identity.matriculeManual
  );

  const user = await tx.user.create({
    data: {
      email: params.identity.email,
      firstName: params.identity.firstName,
      lastName: params.identity.lastName,
      passwordHash,
      dateOfBirth: new Date(params.identity.dateOfBirth),
      sex: params.identity.sex,
      matricule,
      ...params.privacy,
    },
  });

  const membership = await tx.membership.create({
    data: { userId: user.id, schoolId: params.schoolId, role: "ENSEIGNANT", status: "ACTIVE" },
  });

  for (const l of params.levels) {
    const discipline = await resolveOrCreateDiscipline(tx, l.disciplineCode, l.disciplineLabel);
    await tx.membershipLevelHours.create({
      data: { membershipId: membership.id, level: l.level, hours: l.hours, disciplineId: discipline.id },
    });
  }

  return { user, membership };
}
