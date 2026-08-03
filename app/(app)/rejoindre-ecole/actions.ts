"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveSchoolCookie } from "@/lib/active-school";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { resolveOrCreateDiscipline } from "@/lib/discipline-form";
import { recomputeUserQuotas } from "@/lib/quota-engine";

export type JoinSchoolState = { error?: string };

const codeSchema = z.object({ code: z.string().min(1, "Code requis") });

export async function joinSchoolWithCode(
  _prevState: JoinSchoolState | undefined,
  formData: FormData
): Promise<JoinSchoolState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Code requis." };

  const parsedLevels = parseLevelHoursFromFormData(formData);
  if (!parsedLevels.ok) return { error: parsedLevels.error };

  const normalizedCode = parsed.data.code.trim().toUpperCase();
  const joinCode = await prisma.joinCode.findUnique({ where: { code: normalizedCode } });
  if (!joinCode || !joinCode.active) {
    return { error: "Code de rattachement invalide ou expiré." };
  }

  // Contrainte @@unique([userId, schoolId]) : au plus UNE Membership pour ce
  // couple, pour toujours — même après un retrait. On ne crée jamais une 2e
  // ligne, on réactive l'existante le cas échéant.
  const existing = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: session.userId, schoolId: joinCode.schoolId } },
  });

  if (existing?.status === "ACTIVE") {
    return { error: "Vous êtes déjà membre de cette école." };
  }

  let membershipId: string;

  if (existing) {
    // Réactivation : rôle explicitement remis à ENSEIGNANT — un ancien rôle
    // élevé (référent/direction) n'est jamais restauré silencieusement ; la
    // direction/référent de cette école devra le régénérer via /ecole/membres.
    const reactivated = await prisma.membership.update({
      where: { id: existing.id },
      data: {
        role: "ENSEIGNANT",
        status: "ACTIVE",
        removedAt: null,
        joinedAt: new Date(),
      },
    });
    membershipId = reactivated.id;
  } else {
    try {
      const createdMembership = await prisma.membership.create({
        data: {
          userId: session.userId,
          schoolId: joinCode.schoolId,
          role: "ENSEIGNANT",
          status: "ACTIVE",
        },
      });
      membershipId = createdMembership.id;
    } catch (error) {
      // Filet de sécurité en cas de double-soumission concurrente.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { error: "Vous êtes déjà membre de cette école." };
      }
      throw error;
    }
  }

  // Remplace plutôt que cumule : en cas de réactivation, d'anciennes lignes
  // ne doivent pas se combiner avec la nouvelle déclaration.
  await prisma.membershipLevelHours.deleteMany({ where: { membershipId } });
  for (const l of parsedLevels.data) {
    const discipline = await resolveOrCreateDiscipline(prisma, l.disciplineCode, l.disciplineLabel);
    await prisma.membershipLevelHours.create({
      data: { membershipId, level: l.level, hours: l.hours, disciplineId: discipline.id },
    });
  }

  await logAudit({
    schoolId: joinCode.schoolId,
    actorId: session.userId,
    action: AuditAction.JOIN_VIA_CODE,
    targetType: "Membership",
    targetId: membershipId,
  });

  // Recalcule l'ETP/quota de TOUTES les écoles de cet utilisateur (pas
  // seulement celle-ci) : le total ETP vient de changer, cf. lib/quota-engine.ts.
  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  if (schoolYear) {
    await recomputeUserQuotas(session.userId, schoolYear.id);
  }

  await setActiveSchoolCookie(joinCode.schoolId, session.userId);
  revalidatePath("/", "layout");
  redirect("/mes-periodes");
}
