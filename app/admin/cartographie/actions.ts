"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type ProspectionState = { error?: string; success?: string };

const schema = z.object({
  numeroFase: z.string().min(1),
  emailDirection: z.string().transform((v) => v.trim() || null),
  poEmail: z.string().transform((v) => v.trim() || null),
  phone: z.string().transform((v) => v.trim() || null),
  website: z.string().transform((v) => v.trim() || null),
  prospectionStatus: z.enum(["A_CONTACTER", "CONTACTEE", "RELANCEE", "REFUS"]),
  lastContactedAt: z
    .string()
    .transform((v) => (v.trim() === "" ? null : new Date(v)))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Date de contact invalide"),
  notes: z.string().max(2000, "Notes trop longues (2000 caractères maximum)").transform((v) => v.trim() || null),
});

/// Met à jour les seules colonnes de relance d'une école de l'annuaire. Les
/// colonnes officielles ne sont jamais éditables ici : elles viennent du
/// fichier de la Fédération et seraient écrasées au prochain import
/// (cf. scripts/importer-cartographie.ts).
export async function updateProspection(
  _prevState: ProspectionState | undefined,
  formData: FormData
): Promise<ProspectionState> {
  const session = await auth();
  if (!session) return { error: "Non authentifié." };

  try {
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: "Accès refusé." };
    throw error;
  }

  const parsed = schema.safeParse({
    numeroFase: formData.get("numeroFase"),
    emailDirection: formData.get("emailDirection") ?? "",
    poEmail: formData.get("poEmail") ?? "",
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    prospectionStatus: formData.get("prospectionStatus"),
    lastContactedAt: formData.get("lastContactedAt") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { numeroFase, ...donnees } = parsed.data;
  const existe = await prisma.fwbSchool.findUnique({ where: { numeroFase }, select: { numeroFase: true } });
  if (!existe) return { error: "École inconnue de l'annuaire." };

  await prisma.fwbSchool.update({ where: { numeroFase }, data: donnees });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.UPDATE_PROSPECTION,
    targetType: "FwbSchool",
    targetId: numeroFase,
    metadata: { prospectionStatus: donnees.prospectionStatus },
  });

  revalidatePath("/admin/cartographie");
  return { success: "Suivi enregistré." };
}
