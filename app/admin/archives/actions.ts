"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import { ArchiveError, nextSchoolYear, writeSchoolYearArchive } from "@/lib/school-year-archive";

export type ArchiveActionState = { error?: string; success?: string };

export async function archiveSchoolYear(
  _prevState: ArchiveActionState | undefined,
  formData: FormData
): Promise<ArchiveActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);

  const current = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  if (!current) return { error: "Aucune année scolaire configurée." };

  // Garde-fou contre le clic accidentel : l'opération bascule toute la
  // plateforme sur une nouvelle année, il faut recopier le libellé à la main.
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== current.label) {
    return { error: `Saisissez exactement « ${current.label} » pour confirmer l'archivage.` };
  }

  let next;
  try {
    next = nextSchoolYear(current.label);
  } catch (error) {
    if (error instanceof ArchiveError) return { error: error.message };
    throw error;
  }

  const alreadyExists = await prisma.schoolYear.findUnique({ where: { label: next.label } });
  if (alreadyExists) {
    return { error: `L'année ${next.label} existe déjà : l'archivage a déjà été effectué.` };
  }

  // L'archive est écrite AVANT toute modification en base : si le disque est
  // absent, plein ou en lecture seule, rien n'a bougé et l'opération peut
  // être relancée telle quelle.
  let summary;
  try {
    summary = await writeSchoolYearArchive(current);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { error: `Échec de l'écriture de l'archive, aucune modification effectuée — ${detail}` };
  }

  const created = await prisma.schoolYear.create({ data: next });

  // Sans AnnualAssignment sur la nouvelle année, chaque enseignant·e
  // retomberait sur l'objectif par défaut de 60 périodes (cf.
  // lib/collaboration-progress.ts) au lieu de son quota au prorata de l'ETP.
  const activeUsers = await prisma.membership.findMany({
    where: { status: "ACTIVE" },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const { userId } of activeUsers) {
    await recomputeUserQuotas(userId, created.id);
  }

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.ARCHIVE_SCHOOL_YEAR,
    targetType: "SchoolYear",
    targetId: current.id,
    metadata: {
      archivedLabel: summary.label,
      newLabel: created.label,
      periodCount: summary.periodCount,
      schoolCount: summary.schoolCount,
      path: summary.path,
      purged: summary.purged,
    },
  });

  revalidatePath("/admin/archives");

  const purgedNote =
    summary.purged.length > 0 ? ` Archives supprimées (rétention) : ${summary.purged.join(", ")}.` : "";
  return {
    success:
      `Année ${summary.label} archivée (${summary.periodCount} période(s), ${summary.schoolCount} relevé(s) PDF) ` +
      `dans ${summary.path}. La plateforme est passée sur ${created.label}, quotas recalculés pour ` +
      `${activeUsers.length} compte(s).${purgedNote}`,
  };
}
