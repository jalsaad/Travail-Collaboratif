"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type AdminPeriodActionState = { error?: string };

async function requireSuperAdmin() {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);
  return session;
}

const periodSchema = z.object({
  type: z.enum(["REUNION_EQUIPE", "COLLABORATION_PEDAGOGIQUE"]),
  date: z.string().min(1, "Date requise"),
  dureePeriodes: z
    .string()
    .min(1, "Durée requise")
    // Colonne Decimal(4,2) en base (cf. schema.prisma) : valeur absolue < 100,
    // sinon Postgres lève une erreur numérique non rattrapable côté Prisma.
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) < 100,
      "Durée invalide (doit être comprise entre 0 et 100)"
    ),
  description: z.string().min(3, "Description trop courte"),
});

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
    dureePeriodes: formData.get("dureePeriodes"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Même règle que pour une réédition par l'initiateur·rice : la période
  // repart en attente de revalidation par tous les intervenants.
  await prisma.$transaction(async (tx) => {
    await tx.collaborativePeriod.update({
      where: { id: periodId },
      data: {
        type: parsed.data.type,
        date: new Date(parsed.data.date),
        dureePeriodes: parsed.data.dureePeriodes,
        description: parsed.data.description,
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
