"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { saveSchoolLogo, InvalidLogoError } from "@/lib/school-logo";
import { computeMatricule, MATRICULE_MANUAL_PATTERN } from "@/lib/matricule";
import { normalizeWebsite, InvalidWebsiteError } from "@/lib/website-url";

export type AdminActionState = { error?: string; success?: string };

// Pouvoir absolu de la plateforme : contrairement à assertCanManageSchool et
// consorts (lib/school-authorization.ts), aucune protection isAccountOwner ni
// de portée par école ici — seul le statut isSuperAdmin est vérifié, toujours
// frais en base (jamais session.isSuperAdmin, snapshot JWT).
async function requireSuperAdmin() {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  try {
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    throw error;
  }
  return session;
}

const schoolInfoSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  reseau: z.string().optional(),
  region: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  locality: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z
    .string()
    .transform((v, ctx) => {
      try {
        return normalizeWebsite(v);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof InvalidWebsiteError ? error.message : "Adresse du site invalide.",
        });
        return z.NEVER;
      }
    })
    .nullable(),
  numeroFase: z.string().optional(),
});

const niveauSchema = z.enum(["MATERNELLE", "PRIMAIRE", "SECONDAIRE"]);
const typeEnseignementSchema = z.enum(["ORDINAIRE", "SPECIALISE"]);

export async function updateSchoolAsAdmin(
  schoolId: string,
  _prevState: AdminActionState | undefined,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireSuperAdmin();

  const parsed = schoolInfoSchema.safeParse({
    name: formData.get("name"),
    reseau: formData.get("reseau") || undefined,
    region: formData.get("region") || undefined,
    address: formData.get("address") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    locality: formData.get("locality") || undefined,
    country: formData.get("country") || undefined,
    phone: formData.get("phone") || undefined,
    website: formData.get("website") ?? "",
    numeroFase: formData.get("numeroFase") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const niveaux = niveauSchema.array().safeParse(formData.getAll("niveaux"));
  const typesEnseignement = typeEnseignementSchema.array().safeParse(formData.getAll("typesEnseignement"));
  if (!niveaux.success || !typesEnseignement.success) {
    return { error: "Niveaux ou type d'enseignement invalide." };
  }

  // Le fichier est optionnel : si l'admin n'a rien choisi, le logo existant
  // reste inchangé (même logique que updateSchoolInfo côté direction/référent
  // — cf. app/(app)/ecole/parametres/actions.ts).
  let logoUrl: string | undefined;
  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      logoUrl = await saveSchoolLogo(schoolId, logoFile);
    } catch (error) {
      if (error instanceof InvalidLogoError) return { error: error.message };
      throw error;
    }
  }

  try {
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: parsed.data.name,
        reseau: parsed.data.reseau || null,
        region: parsed.data.region || null,
        niveaux: niveaux.data,
        typesEnseignement: typesEnseignement.data,
        address: parsed.data.address || null,
        postalCode: parsed.data.postalCode || null,
        locality: parsed.data.locality || null,
        country: parsed.data.country || null,
        phone: parsed.data.phone || null,
        website: parsed.data.website,
        numeroFase: parsed.data.numeroFase || null,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ce numéro FASE est déjà utilisé par une autre école." };
    }
    throw error;
  }

  await logAudit({
    schoolId,
    actorId: session.userId,
    action: AuditAction.UPDATE_SCHOOL_INFO,
    targetType: "School",
    targetId: schoolId,
  });

  revalidatePath(`/admin/ecoles/${schoolId}`);
  return { success: "École mise à jour." };
}

export async function deleteSchoolAsAdmin(schoolId: string) {
  const session = await requireSuperAdmin();

  const school = await prisma.school.findUniqueOrThrow({ where: { id: schoolId } });

  // Journalisé AVANT la suppression (schoolId serait sinon orphelin), avec le
  // nom conservé en metadata pour rester lisible dans le journal une fois
  // l'école supprimée.
  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.DELETE_SCHOOL,
    targetType: "School",
    targetId: schoolId,
    metadata: { name: school.name },
  });

  // Cascade Prisma : memberships, invitations, joinCodes, exportLogs,
  // auditLogs (schoolId), announcementTargets, implantations — tous liés à
  // cette école sont supprimés avec elle (cf. onDelete: Cascade du schéma).
  await prisma.school.delete({ where: { id: schoolId } });

  redirect("/admin/ecoles");
}

const memberProfileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  // Identité saisie à la création du compte (cf. app/(auth)/creer-ecole et
  // app/(auth)/rejoindre) : nullable en base pour les comptes antérieurs à
  // cette fonctionnalité, donc les trois champs restent optionnels ici aussi
  // — recalculés ensemble seulement s'ils sont TOUS renseignés (cf. plus bas).
  dateOfBirth: z.string().optional(),
  sex: z.enum(["M", "F"]).optional(),
  matriculeManual: z.string().regex(MATRICULE_MANUAL_PATTERN, "4 chiffres requis").optional(),
});

export async function updateMemberAsAdmin(
  _prevState: AdminActionState | undefined,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireSuperAdmin();

  const membershipId = formData.get("membershipId") as string;
  const parsed = memberProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    sex: formData.get("sex") || undefined,
    matriculeManual: formData.get("matriculeManual") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });
  if (!target) return { error: "Membre introuvable." };

  const { dateOfBirth, sex, matriculeManual, ...profileData } = parsed.data;
  const previousEmail = target.user.email;
  try {
    await prisma.user.update({
      where: { id: target.userId },
      data: {
        ...profileData,
        ...(dateOfBirth && sex && matriculeManual
          ? {
              dateOfBirth: new Date(dateOfBirth),
              sex,
              matricule: computeMatricule(sex, dateOfBirth, matriculeManual),
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target2 = (error.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target2.includes("matricule")) {
        return { error: "Ce numéro de matricule est déjà utilisé par un autre compte." };
      }
      return { error: "Cette adresse email est déjà utilisée par un autre compte." };
    }
    throw error;
  }

  await logAudit({
    schoolId: target.schoolId,
    actorId: session.userId,
    action: AuditAction.UPDATE_MEMBER_PROFILE,
    targetType: "User",
    targetId: target.userId,
    metadata: { previousEmail, newEmail: parsed.data.email },
  });

  revalidatePath(`/admin/ecoles/${target.schoolId}`);
  revalidatePath(`/admin/ecoles/${target.schoolId}/membres/${membershipId}`);
  return { success: "Profil mis à jour." };
}

const roleSchema = z.enum(["DIRECTION", "REFERENT_NUMERIQUE", "ENSEIGNANT"]);

export async function changeMemberRoleAsAdmin(
  _prevState: AdminActionState | undefined,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireSuperAdmin();

  const membershipId = formData.get("membershipId") as string;
  const parsedRole = roleSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) return { error: "Rôle invalide." };

  const target = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!target) return { error: "Membre introuvable." };

  const previousRole: Role = target.role;
  await prisma.membership.update({ where: { id: target.id }, data: { role: parsedRole.data } });

  await logAudit({
    schoolId: target.schoolId,
    actorId: session.userId,
    action: AuditAction.UPDATE_MEMBER_ROLE,
    targetType: "Membership",
    targetId: target.id,
    metadata: { from: previousRole, to: parsedRole.data },
  });

  revalidatePath(`/admin/ecoles/${target.schoolId}`);
  return { success: "Rôle mis à jour." };
}

export async function removeMemberAsAdmin(
  _prevState: AdminActionState | undefined,
  formData: FormData
): Promise<AdminActionState> {
  const session = await requireSuperAdmin();

  const membershipId = formData.get("membershipId") as string;
  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });
  if (!target) return { error: "Membre introuvable." };

  await prisma.membership.update({
    where: { id: target.id },
    data: { status: "REMOVED", removedAt: new Date() },
  });

  await logAudit({
    schoolId: target.schoolId,
    actorId: session.userId,
    action: AuditAction.REMOVE_MEMBER,
    targetType: "Membership",
    targetId: target.id,
    metadata: { targetUserId: target.userId, targetEmail: target.user.email },
  });

  revalidatePath(`/admin/ecoles/${target.schoolId}`);
  return { success: "Membre retiré de l'école." };
}
