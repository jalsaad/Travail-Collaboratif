"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { resolveOrCreateDiscipline } from "@/lib/discipline-form";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export type OwnProfileState = { error?: string; success?: string };

const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
});

// Auto-gestion uniquement : l'acteur ne peut ici modifier QUE ses propres
// données (session.userId, jamais un identifiant fourni par le client) — pas
// de garde de rôle nécessaire, contrairement à updateMemberProfile qui gère
// le cas où une direction modifie le profil d'un·e collègue.
//
// dateOfBirth/sex/matricule ne sont volontairement jamais lus depuis
// formData ici : ces champs servent au calcul du matricule (unique en base)
// et un utilisateur ne peut pas les modifier lui-même, même en falsifiant la
// requête — le formulaire les affiche en lecture seule mais c'est cette
// absence côté serveur qui garantit vraiment la restriction.
export async function updateOwnProfile(
  _prevState: OwnProfileState | undefined,
  formData: FormData
): Promise<OwnProfileState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const newPasswordConfirmation = formData.get("newPasswordConfirmation");
  const wantsPasswordChange = [currentPassword, newPassword, newPasswordConfirmation].some(
    (v) => typeof v === "string" && v.length > 0
  );

  let newPasswordHash: string | undefined;
  if (wantsPasswordChange) {
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof newPasswordConfirmation !== "string" ||
      !currentPassword ||
      !newPassword ||
      !newPasswordConfirmation
    ) {
      return { error: "Renseignez les trois champs pour changer de mot de passe." };
    }
    if (newPassword.length < 8) {
      return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
    }
    if (newPassword !== newPasswordConfirmation) {
      return { error: "Les nouveaux mots de passe ne correspondent pas." };
    }

    const existing = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    const valid = existing.passwordHash && (await bcrypt.compare(currentPassword, existing.passwordHash));
    if (!valid) {
      return { error: "Mot de passe actuel incorrect." };
    }
    newPasswordHash = await bcrypt.hash(newPassword, 10);
  }

  const previous = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { ...parsed.data, ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Cette adresse email est déjà utilisée par un autre compte." };
    }
    throw error;
  }

  const active = await resolveActiveMembership(session.userId);
  await logAudit({
    schoolId: active?.schoolId ?? null,
    actorId: session.userId,
    action: AuditAction.UPDATE_MEMBER_PROFILE,
    targetType: "User",
    targetId: session.userId,
    metadata: { previousEmail: previous.email, newEmail: parsed.data.email },
  });
  if (newPasswordHash) {
    await logAudit({
      schoolId: active?.schoolId ?? null,
      actorId: session.userId,
      action: AuditAction.RESET_PASSWORD,
      targetType: "User",
      targetId: session.userId,
    });
  }

  revalidatePath("/mon-profil");
  return { success: "Profil mis à jour." };
}

export type TeachingInfoState = { error?: string; success?: string };

// Porte sur la Membership ACTIVE (école courante, cf. lib/active-school.ts),
// jamais sur un membershipId fourni par le client — même principe
// d'auto-gestion que updateOwnProfile. Ouvert à tout rôle (une direction ou
// un référent numérique peut aussi donner cours) : niveaux/heures/discipline
// sont facultatifs ici (required: false), contrairement aux parcours
// d'inscription ENSEIGNANT où ils restent obligatoires.
export async function updateTeachingInfo(
  _prevState: TeachingInfoState | undefined,
  formData: FormData
): Promise<TeachingInfoState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const active = await resolveActiveMembership(session.userId);
  if (!active) {
    return { error: "Aucune école active." };
  }

  const parsedLevels = parseLevelHoursFromFormData(formData, { required: false });
  if (!parsedLevels.ok) {
    return { error: parsedLevels.error };
  }

  await prisma.$transaction(async (tx) => {
    await tx.membershipLevelHours.deleteMany({ where: { membershipId: active.membershipId } });
    for (const l of parsedLevels.data) {
      const discipline = await resolveOrCreateDiscipline(tx, l.disciplineCode, l.disciplineLabel);
      await tx.membershipLevelHours.create({
        data: { membershipId: active.membershipId, level: l.level, hours: l.hours, disciplineId: discipline.id },
      });
    }
  });

  // L'ETP a potentiellement changé : recalcule le quota sur TOUTES les
  // écoles de cet utilisateur, pas seulement celle-ci (cf. lib/quota-engine.ts).
  const schoolYear = await getCurrentSchoolYear();
  if (schoolYear) {
    if (parsedLevels.data.length === 0) {
      // recomputeUserQuotas ne touche jamais une Membership sans déclaration
      // (cf. son commentaire) : si l'utilisateur vient de tout effacer, son
      // ancien quota resterait sinon périmé en base.
      await prisma.annualAssignment.deleteMany({
        where: { membershipId: active.membershipId, schoolYearId: schoolYear.id },
      });
    }
    await recomputeUserQuotas(session.userId, schoolYear.id);
  }

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.UPDATE_TEACHING_INFO,
    targetType: "Membership",
    targetId: active.membershipId,
  });

  revalidatePath("/mon-profil");
  revalidatePath("/mes-periodes");
  return { success: "Informations d'enseignement mises à jour." };
}
