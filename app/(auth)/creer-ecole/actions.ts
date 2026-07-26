"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createJoinCodeForSchool } from "@/lib/join-codes";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { computeMatricule, MATRICULE_MANUAL_PATTERN } from "@/lib/matricule";

export type CreateSchoolState = { error?: string };

const schoolSchema = z.object({
  name: z.string().min(1, "Nom de l'école requis"),
  reseau: z.string().min(1, "Réseau d'enseignement requis"),
  address: z.string().min(1, "Adresse requise"),
  phone: z.string().min(1, "Téléphone requis"),
  numeroFase: z.string().min(1, "Numéro FASE requis"),
  role: z.enum(["DIRECTION", "REFERENT_NUMERIQUE"]),
});

const founderSchema = z
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

export async function createSchool(
  _prevState: CreateSchoolState | undefined,
  formData: FormData
): Promise<CreateSchoolState> {
  const parsedSchool = schoolSchema.safeParse({
    name: formData.get("name"),
    reseau: formData.get("reseau"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    numeroFase: formData.get("numeroFase"),
    role: formData.get("role"),
  });
  if (!parsedSchool.success) {
    return { error: parsedSchool.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const parsedFounder = founderSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
    matriculeManual: formData.get("matriculeManual"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsedFounder.success) {
    return { error: parsedFounder.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const email = parsedFounder.data.email.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  const founderEmail = email;
  const founderPassword = parsedFounder.data.password;
  const passwordHash = await bcrypt.hash(founderPassword, 10);
  const matricule = computeMatricule(
    parsedFounder.data.sex,
    parsedFounder.data.dateOfBirth,
    parsedFounder.data.matriculeManual
  );

  let founderUserId: string;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        firstName: parsedFounder.data.firstName,
        lastName: parsedFounder.data.lastName,
        passwordHash,
        dateOfBirth: new Date(parsedFounder.data.dateOfBirth),
        sex: parsedFounder.data.sex,
        matricule,
      },
    });
    founderUserId = user.id;
  } catch (error) {
    // Filet de sécurité en cas de double-soumission concurrente (le
    // findUnique ci-dessus n'est pas atomique avec la création) — collision
    // possible sur l'email ou, plus rarement, sur le matricule.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("matricule")) {
        return { error: "Ce numéro de matricule est déjà utilisé par un autre compte." };
      }
      return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    throw error;
  }

  let school;
  try {
    school = await prisma.$transaction(async (tx) => {
      const createdSchool = await tx.school.create({
        data: {
          name: parsedSchool.data.name,
          reseau: parsedSchool.data.reseau,
          address: parsedSchool.data.address,
          phone: parsedSchool.data.phone,
          numeroFase: parsedSchool.data.numeroFase,
          // Toute école créée via ce flux public attend une validation par
          // la plateforme (app/admin/ecoles) avant de devenir opérationnelle
          // — cf. la garde dans app/(app)/layout.tsx.
          status: "PENDING",
        },
      });

      // Le fondateur devient titulaire du compte (isAccountOwner) — cf.
      // permissions.md : protégé contre le retrait/la rétrogradation par qui
      // que ce soit d'autre que lui-même.
      await tx.membership.create({
        data: {
          userId: founderUserId,
          schoolId: createdSchool.id,
          role: parsedSchool.data.role,
          status: "ACTIVE",
          isAccountOwner: true,
        },
      });

      await createJoinCodeForSchool(tx, createdSchool.id, createdSchool.name, founderUserId);

      return createdSchool;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ce numéro FASE est déjà utilisé par une autre école." };
    }
    throw error;
  }

  await logAudit({
    schoolId: school.id,
    actorId: founderUserId,
    action: AuditAction.CREATE_SCHOOL,
    targetType: "School",
    targetId: school.id,
  });

  try {
    await signIn("credentials", {
      email: founderEmail,
      password: founderPassword,
      redirectTo: "/mes-periodes",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "École créée, mais connexion automatique impossible. Merci de vous connecter." };
    }
    throw error; // laisse passer la redirection interne de signIn en cas de succès
  }
}
