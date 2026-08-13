"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import { ArchiveError, nextSchoolYear, writeSchoolYearArchive } from "@/lib/school-year-archive";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export type ArchiveActionState = { error?: string; success?: string };

const LABEL_PATTERN = /^\d{4}-\d{4}$/;

/// Les dates saisies sont interprétées en UTC, comme celles calculées par
/// lib/school-year-dates.ts — sans le suffixe Z, un serveur en heure d'été
/// décalerait la date d'un jour.
function parseDay(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/// Bornes de l'année scolaire, saisies à la main.
///
/// Le calendrier FWB (dernier lundi d'août -> premier vendredi de juillet)
/// ne sert qu'à pré-remplir le formulaire : la Fédération y déroge certaines
/// années, la valeur retenue est donc toujours celle saisie.
function parseDates(formData: FormData, prefix = ""):
  | { startDate: Date; endDate: Date }
  | { error: string } {
  const startDate = parseDay(formData.get(`${prefix}startDate`));
  const endDate = parseDay(formData.get(`${prefix}endDate`));
  if (!startDate) return { error: "Date de début manquante ou invalide." };
  if (!endDate) return { error: "Date de fin manquante ou invalide." };
  if (endDate <= startDate) {
    return { error: "La date de fin doit être postérieure à la date de début." };
  }
  return { startDate, endDate };
}

/// Crée la première année scolaire d'une instance — le seul autre point de
/// création est l'archivage, qui exige qu'une année existe déjà pour en
/// déduire la suivante.
export async function createSchoolYear(
  _prevState: ArchiveActionState | undefined,
  formData: FormData
): Promise<ArchiveActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);

  const label = String(formData.get("label") ?? "").trim();
  if (!LABEL_PATTERN.test(label)) {
    return { error: "Le libellé doit être de la forme AAAA-AAAA (ex : 2026-2027)." };
  }

  const dates = parseDates(formData);
  if ("error" in dates) return dates;

  const existing = await prisma.schoolYear.findUnique({ where: { label } });
  if (existing) return { error: `L'année ${label} existe déjà.` };

  const created = await prisma.schoolYear.create({ data: { label, ...dates } });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.CREATE_SCHOOL_YEAR,
    targetType: "SchoolYear",
    targetId: created.id,
    metadata: { label: created.label },
  });

  revalidatePath("/admin/archives");
  return { success: `Année ${created.label} ouverte.` };
}

/// Corrige les bornes d'une année existante — la FWB peut publier un
/// calendrier dérogatoire après coup. Le libellé, lui, n'est pas modifiable :
/// il sert de nom de dossier aux archives déjà écrites sur le disque.
export async function updateSchoolYearDates(
  schoolYearId: string,
  _prevState: ArchiveActionState | undefined,
  formData: FormData
): Promise<ArchiveActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);

  const dates = parseDates(formData);
  if ("error" in dates) return dates;

  const updated = await prisma.schoolYear.update({
    where: { id: schoolYearId },
    data: dates,
  });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.UPDATE_SCHOOL_YEAR,
    targetType: "SchoolYear",
    targetId: updated.id,
    metadata: {
      label: updated.label,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
    },
  });

  revalidatePath("/admin/archives");
  return { success: `Dates de l'année ${updated.label} mises à jour.` };
}

export async function archiveSchoolYear(
  _prevState: ArchiveActionState | undefined,
  formData: FormData
): Promise<ArchiveActionState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);

  const current = await getCurrentSchoolYear();
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

  // Les dates de la nouvelle année viennent du formulaire : nextSchoolYear()
  // n'a servi qu'à en proposer le libellé et un pré-remplissage.
  const nextDates = parseDates(formData, "next");
  if ("error" in nextDates) return nextDates;
  next = { ...next, ...nextDates };

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
