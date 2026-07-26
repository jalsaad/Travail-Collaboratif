"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type SchoolApprovalState = { error?: string; success?: string };

async function setSchoolStatus(
  schoolId: string,
  status: "APPROVED" | "REJECTED",
  action: string
): Promise<SchoolApprovalState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  try {
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  const school = await prisma.school.update({
    where: { id: schoolId },
    data: { status },
  });

  await logAudit({
    schoolId: school.id,
    actorId: session.userId,
    action,
    targetType: "School",
    targetId: school.id,
  });

  revalidatePath("/admin/ecoles");
  return { success: status === "APPROVED" ? "École approuvée." : "École refusée." };
}

export async function approveSchool(
  _prevState: SchoolApprovalState,
  formData: FormData
): Promise<SchoolApprovalState> {
  const schoolId = String(formData.get("schoolId") ?? "");
  return setSchoolStatus(schoolId, "APPROVED", AuditAction.APPROVE_SCHOOL);
}

export async function rejectSchool(
  _prevState: SchoolApprovalState,
  formData: FormData
): Promise<SchoolApprovalState> {
  const schoolId = String(formData.get("schoolId") ?? "");
  return setSchoolStatus(schoolId, "REJECTED", AuditAction.REJECT_SCHOOL);
}
