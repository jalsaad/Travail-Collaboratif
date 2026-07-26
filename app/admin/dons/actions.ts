"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type DonationsFlagState = { error?: string; success?: string };

export async function toggleDonationsFlag(): Promise<DonationsFlagState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  try {
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  const flag = await prisma.featureFlag.upsert({
    where: { key: "donations" },
    update: {},
    create: { key: "donations", enabled: false },
  });

  const updated = await prisma.featureFlag.update({
    where: { key: "donations" },
    data: { enabled: !flag.enabled },
  });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.TOGGLE_DONATIONS_FLAG,
    targetType: "FeatureFlag",
    targetId: updated.id,
    metadata: { enabled: updated.enabled },
  });

  revalidatePath("/admin/dons");
  return { success: updated.enabled ? "Service dons activé." : "Service dons désactivé." };
}
