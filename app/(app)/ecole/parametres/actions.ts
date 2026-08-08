"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { assertCanManageSchool, ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { createJoinCodeForSchool } from "@/lib/join-codes";
import { saveSchoolLogo, InvalidLogoError } from "@/lib/school-logo";

export type SchoolActionState = { error?: string; success?: string };

const schoolInfoSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  reseau: z.string().optional(),
  region: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  locality: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

const niveauSchema = z.enum(["MATERNELLE", "PRIMAIRE", "SECONDAIRE"]);
const typeEnseignementSchema = z.enum(["ORDINAIRE", "SPECIALISE"]);

export async function updateSchoolInfo(
  _prevState: SchoolActionState | undefined,
  formData: FormData
): Promise<SchoolActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active." };

  try {
    await assertCanManageSchool(session.userId, active.schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  const parsed = schoolInfoSchema.safeParse({
    name: formData.get("name"),
    reseau: formData.get("reseau") || undefined,
    region: formData.get("region") || undefined,
    address: formData.get("address") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    locality: formData.get("locality") || undefined,
    country: formData.get("country") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const niveaux = niveauSchema.array().safeParse(formData.getAll("niveaux"));
  const typesEnseignement = typeEnseignementSchema.array().safeParse(formData.getAll("typesEnseignement"));
  if (!niveaux.success || !typesEnseignement.success) {
    return { error: "Niveaux ou type d'enseignement invalide." };
  }

  // Le fichier est optionnel : si l'utilisateur n'a rien choisi, le logo
  // existant reste inchangé (on ne touche pas à logoUrl dans ce cas).
  let logoUrl: string | undefined;
  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      logoUrl = await saveSchoolLogo(active.schoolId, logoFile);
    } catch (error) {
      if (error instanceof InvalidLogoError) return { error: error.message };
      throw error;
    }
  }

  // numeroFase n'est délibérément ni lu depuis formData, ni dans le schema, ni
  // dans le data ci-dessous — le verrou est côté serveur, pas seulement
  // l'attribut HTML `disabled` (contournable côté client).
  await prisma.school.update({
    where: { id: active.schoolId },
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
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.UPDATE_SCHOOL_INFO,
    targetType: "School",
    targetId: active.schoolId,
  });

  revalidatePath("/ecole/parametres");
  revalidatePath("/ecole");
  return { success: "Informations mises à jour." };
}

export async function regenerateJoinCode(): Promise<SchoolActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active." };

  try {
    await assertCanManageSchool(session.userId, active.schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  const school = await prisma.school.findUniqueOrThrow({ where: { id: active.schoolId } });

  const newCode = await prisma.$transaction(async (tx) => {
    // "Régénérer un code désactive l'ancien plutôt que de le supprimer" (cf.
    // commentaire du schéma) — traçabilité des rattachements passés préservée.
    await tx.joinCode.updateMany({
      where: { schoolId: active.schoolId, active: true },
      data: { active: false, deactivatedAt: new Date() },
    });

    return createJoinCodeForSchool(tx, active.schoolId, school.name, session.userId);
  });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.REGENERATE_JOIN_CODE,
    targetType: "JoinCode",
    targetId: newCode.id,
    metadata: { code: newCode.code },
  });

  revalidatePath("/ecole/parametres");
  return { success: `Nouveau code : ${newCode.code}` };
}
