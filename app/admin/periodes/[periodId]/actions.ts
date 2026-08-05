"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { periodesBetween } from "@/lib/period-duration";
import { periodCoreFields, timeRangeIsOrdered } from "@/app/(app)/declarer/schema";

export type AdminPeriodActionState = { error?: string };

async function requireSuperAdmin() {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);
  return session;
}

// Mêmes règles que côté enseignant·e (cf. app/(app)/declarer/schema.ts), sans
// la sélection de collègues qui n'est pas éditable depuis l'administration.
const periodSchema = z.object(periodCoreFields).refine(timeRangeIsOrdered.check, timeRangeIsOrdered.params);

export async function updatePeriodAsAdmin(
  periodId: string,
  returnTo: string,
  _prevState: AdminPeriodActionState | undefined,
  formData: FormData
): Promise<AdminPeriodActionState> {
  const session = await requireSuperAdmin();

  const parsed = periodSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    heureDebut: formData.get("heureDebut"),
    heureFin: formData.get("heureFin"),
    natureActivite: formData.get("natureActivite") ?? "",
    description: formData.get("description"),
    objectifsPilotage: formData.get("objectifsPilotage") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Non-null garanti par le refine du schéma.
  const dureePeriodes = periodesBetween(parsed.data.heureDebut, parsed.data.heureFin)!;

  // Même règle que pour une réédition par l'initiateur·rice : la période
  // repart en attente de revalidation par tous les intervenants.
  await prisma.$transaction(async (tx) => {
    await tx.collaborativePeriod.update({
      where: { id: periodId },
      data: {
        type: parsed.data.type,
        date: new Date(parsed.data.date),
        heureDebut: parsed.data.heureDebut,
        heureFin: parsed.data.heureFin,
        dureePeriodes,
        natureActivite: parsed.data.natureActivite,
        description: parsed.data.description,
        objectifsPilotage: parsed.data.objectifsPilotage,
      },
    });
    await tx.periodParticipant.updateMany({
      where: { periodId },
      data: { status: "PENDING", confirmedAt: null },
    });
  });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.UPDATE_PERIOD,
    targetType: "CollaborativePeriod",
    targetId: periodId,
  });

  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function deletePeriodAsAdmin(periodId: string, schoolId: string) {
  const session = await requireSuperAdmin();

  await prisma.collaborativePeriod.delete({ where: { id: periodId } });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.DELETE_PERIOD,
    targetType: "CollaborativePeriod",
    targetId: periodId,
  });

  revalidatePath(`/admin/ecoles/${schoolId}`);
}
