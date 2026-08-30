"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import { notifySchoolDirectionOfNewMember } from "@/lib/school-notifications";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { teacherIdentitySchema, createTeacherAccountAndMembership } from "@/lib/teacher-signup";

export type JoinState = { error?: string };

// Deux façons d'identifier l'école, au choix de l'enseignant·e (cf.
// components/join-form.tsx) : le code reçu de sa direction, ou l'école
// elle-même choisie dans une liste — les deux résolvent au même JoinCode actif
// ci-dessous, donc la même garantie de sécurité (une école sans code actif
// n'est joignable par aucun des deux chemins).
const joinSchema = teacherIdentitySchema
  .and(
    z.object({
      code: z.string().transform((v) => v.trim() || null),
      schoolId: z.string().transform((v) => v.trim() || null),
    })
  )
  .refine((data) => !!data.code || !!data.schoolId, {
    message: "Choisissez un code de rattachement ou une école dans la liste.",
    path: ["code"],
  });

export async function joinViaCode(
  _prevState: JoinState | undefined,
  formData: FormData
): Promise<JoinState> {
  const parsed = joinSchema.safeParse({
    code: formData.get("code") ?? "",
    schoolId: formData.get("schoolId") ?? "",
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

  const email = parsed.data.email.trim();

  // Le code saisi à la main et l'école choisie dans la liste résolvent tous
  // deux vers le JoinCode actif de l'école — jamais un school Id de client
  // pris pour argent comptant sans cette vérification.
  const joinCode = parsed.data.code
    ? await prisma.joinCode.findUnique({ where: { code: parsed.data.code.toUpperCase() } })
    : await prisma.joinCode.findFirst({
        where: { schoolId: parsed.data.schoolId!, active: true },
        orderBy: { createdAt: "desc" },
      });
  if (!joinCode || !joinCode.active) {
    // Message générique : ne révèle jamais si le code existe mais est désactivé.
    return { error: "Code de rattachement invalide ou expiré." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  let created;
  try {
    created = await prisma.$transaction((tx) =>
      createTeacherAccountAndMembership(tx, {
        schoolId: joinCode.schoolId,
        identity: parsed.data,
        levels: parsedLevels.data,
      })
    );
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

  const schoolYear = await getCurrentSchoolYear();
  if (schoolYear) {
    await recomputeUserQuotas(created.user.id, schoolYear.id);
  }

  // Avant signIn, qui redirige : rien ne s'exécuterait après.
  await notifySchoolDirectionOfNewMember(created.membership.id);

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

export type JoinableSchool = { id: string; name: string; locality: string | null };

/// Alternative au code de rattachement tapé à l'aveugle : l'enseignant·e
/// cherche son école déjà inscrite par son nom (cf.
/// components/joinable-school-search.tsx). Seules les écoles APPROVED avec un
/// JoinCode actif remontent — inutile de proposer un choix qui échouerait
/// ensuite dans joinViaCode.
export async function searchJoinableSchools(query: string): Promise<JoinableSchool[]> {
  const terme = query.trim();
  if (terme.length < 2) return [];

  const schools = await prisma.school.findMany({
    where: {
      status: "APPROVED",
      name: { contains: terme, mode: "insensitive" },
      joinCodes: { some: { active: true } },
    },
    select: { id: true, name: true, locality: true },
    orderBy: { name: "asc" },
    take: 10,
  });
  return schools;
}
