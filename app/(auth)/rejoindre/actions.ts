"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { computeMatricule, MATRICULE_MANUAL_PATTERN } from "@/lib/matricule";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { resolveOrCreateDiscipline } from "@/lib/discipline-form";
import { recomputeUserQuotas } from "@/lib/quota-engine";

export type JoinState = { error?: string };

const joinSchema = z
  .object({
    code: z.string().min(1, "Code requis"),
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

export async function joinViaCode(
  _prevState: JoinState | undefined,
  formData: FormData
): Promise<JoinState> {
  const parsed = joinSchema.safeParse({
    code: formData.get("code"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
    matriculeManual: formData.get("matriculeManual"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const parsedLevels = parseLevelHoursFromFormData(formData);
  if (!parsedLevels.ok) {
    return { error: parsedLevels.error };
  }

  const normalizedCode = parsed.data.code.trim().toUpperCase();
  const email = parsed.data.email.trim();

  const joinCode = await prisma.joinCode.findUnique({ where: { code: normalizedCode } });
  if (!joinCode || !joinCode.active) {
    // Message générique : ne révèle jamais si le code existe mais est désactivé.
    return { error: "Code de rattachement invalide ou expiré." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const matricule = computeMatricule(parsed.data.sex, parsed.data.dateOfBirth, parsed.data.matriculeManual);

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          passwordHash,
          dateOfBirth: new Date(parsed.data.dateOfBirth),
          sex: parsed.data.sex,
          matricule,
        },
      });
      const membership = await tx.membership.create({
        data: { userId: user.id, schoolId: joinCode.schoolId, role: "ENSEIGNANT", status: "ACTIVE" },
      });
      for (const l of parsedLevels.data) {
        const discipline = await resolveOrCreateDiscipline(tx, l.disciplineCode, l.disciplineLabel);
        await tx.membershipLevelHours.create({
          data: { membershipId: membership.id, level: l.level, hours: l.hours, disciplineId: discipline.id },
        });
      }
      return { user, membership };
    });
  } catch (error) {
    // Filet de sécurité si deux soumissions concurrentes visent le même email
    // (le contrôle findUnique ci-dessus n'est pas atomique avec la création),
    // ou plus rarement, le même matricule.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("matricule")) {
        return { error: "Ce numéro de matricule est déjà utilisé par un autre compte." };
      }
      return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    throw error;
  }

  await logAudit({
    schoolId: joinCode.schoolId,
    actorId: created.user.id,
    action: AuditAction.JOIN_VIA_CODE,
    targetType: "Membership",
    targetId: created.membership.id,
  });

  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  if (schoolYear) {
    await recomputeUserQuotas(created.user.id, schoolYear.id);
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/mes-periodes",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais connexion automatique impossible. Merci de vous connecter." };
    }
    throw error; // laisse passer la redirection interne de signIn en cas de succès
  }
}
