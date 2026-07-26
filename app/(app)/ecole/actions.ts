"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { assertCanManageSchool, ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";

export type ReminderActionState = { error?: string; success?: string };

const reminderSchema = z.object({
  message: z.string().min(1, "Message requis"),
  days: z
    .string()
    .min(1, "Durée requise")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 30, {
      message: "La durée doit être un nombre de jours entre 1 et 30.",
    }),
});

// Rappel éphémère envoyé par la direction/l'admin à SES enseignant·es
// (jamais aux autres écoles ni aux autres rôles) — réutilise le système
// d'annonces existant (Announcement/AnnouncementTarget), simplement scopé à
// l'école active et expirant automatiquement 5 jours après publication.
export async function publishTeacherReminder(
  _prevState: ReminderActionState | undefined,
  formData: FormData
): Promise<ReminderActionState> {
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

  const parsed = reminderSchema.safeParse({
    message: formData.get("message"),
    days: formData.get("days"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const days = Number(parsed.data.days);
  const now = new Date();
  const announcement = await prisma.announcement.create({
    data: {
      title: "Rappel — remise du travail collaboratif",
      body: parsed.data.message.trim(),
      status: "PUBLISHED",
      publishAt: now,
      expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      createdById: session.userId,
      targets: { create: [{ schoolId: active.schoolId, role: "ENSEIGNANT" }] },
    },
  });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.PUBLISH_ANNOUNCEMENT,
    targetType: "Announcement",
    targetId: announcement.id,
    metadata: { days },
  });

  revalidatePath("/ecole");
  return { success: `Rappel publié pour ${days} jour${days > 1 ? "s" : ""}.` };
}

export async function cancelTeacherReminder(announcementId: string) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const active = await resolveActiveMembership(session.userId);
  if (!active) throw new Error("Aucune école active.");

  await assertCanManageSchool(session.userId, active.schoolId);

  // Défense en profondeur : ne permet d'annuler QUE les rappels ciblant
  // effectivement cette école, jamais une annonce d'une autre école ou une
  // annonce plateforme.
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, targets: { some: { schoolId: active.schoolId } } },
  });
  if (!announcement) return;

  await prisma.announcement.update({ where: { id: announcement.id }, data: { status: "ARCHIVED" } });

  await logAudit({
    schoolId: active.schoolId,
    actorId: session.userId,
    action: AuditAction.CANCEL_ANNOUNCEMENT,
    targetType: "Announcement",
    targetId: announcement.id,
  });

  revalidatePath("/ecole");
}
