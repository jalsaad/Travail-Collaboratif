"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { saveAnnouncementMedia, deleteAnnouncementMediaFile, InvalidMediaError } from "@/lib/announcement-media";

export type AnnouncementActionState = { error?: string; success?: string };

const roleSchema = z.enum(["DIRECTION", "REFERENT_NUMERIQUE", "ENSEIGNANT"]);

async function requireSuperAdmin() {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");
  await assertIsSuperAdmin(session.userId);
  return session;
}

function readTargetRow(formData: FormData, index: number) {
  const role = formData.get(`role${index}`);
  const schoolId = formData.get(`schoolId${index}`);
  const reseau = formData.get(`reseau${index}`);
  const disciplineId = formData.get(`disciplineId${index}`);

  const parsedRole = typeof role === "string" && role ? roleSchema.safeParse(role) : null;

  const row = {
    role: parsedRole?.success ? parsedRole.data : undefined,
    schoolId: typeof schoolId === "string" && schoolId ? schoolId : undefined,
    reseau: typeof reseau === "string" && reseau.trim() ? reseau.trim() : undefined,
    disciplineId: typeof disciplineId === "string" && disciplineId ? disciplineId : undefined,
  };

  const isEmpty = !row.role && !row.schoolId && !row.reseau && !row.disciplineId;
  return isEmpty ? null : row;
}

// Enregistre chaque fichier valide du champ "media" (multiple) comme une
// pièce jointe rattachée à l'annonce — un fichier invalide interrompt tout
// le lot avec un message explicite plutôt que d'ignorer silencieusement.
async function saveMediaFiles(formData: FormData, announcementId: string) {
  const files = formData.getAll("media").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const saved = await saveAnnouncementMedia(file);
    await prisma.announcementMedia.create({
      data: {
        announcementId,
        type: saved.type,
        url: saved.url,
        mimeType: saved.mimeType,
      },
    });
  }
}

export async function createAnnouncement(
  _prevState: AnnouncementActionState | undefined,
  formData: FormData
): Promise<AnnouncementActionState> {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  const title = formData.get("title");
  const body = formData.get("body");
  if (typeof title !== "string" || !title.trim()) return { error: "Titre requis." };
  if (typeof body !== "string" || !body.trim()) return { error: "Corps du message requis." };

  const targets = [1, 2, 3].map((i) => readTargetRow(formData, i)).filter((t) => t !== null);
  if (targets.length === 0) {
    return { error: "Au moins une ligne de ciblage est requise." };
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      status: "PUBLISHED",
      publishAt: new Date(),
      createdById: session.userId,
      targets: { create: targets },
    },
  });

  try {
    await saveMediaFiles(formData, announcement.id);
  } catch (error) {
    if (error instanceof InvalidMediaError) return { error: error.message };
    throw error;
  }

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.PUBLISH_ANNOUNCEMENT,
    targetType: "Announcement",
    targetId: announcement.id,
    metadata: { title: announcement.title },
  });

  revalidatePath("/admin/annonces");
  return { success: "Annonce publiée." };
}

export async function updateAnnouncement(
  announcementId: string,
  _prevState: AnnouncementActionState | undefined,
  formData: FormData
): Promise<AnnouncementActionState> {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  const title = formData.get("title");
  const body = formData.get("body");
  if (typeof title !== "string" || !title.trim()) return { error: "Titre requis." };
  if (typeof body !== "string" || !body.trim()) return { error: "Corps du message requis." };

  const targets = [1, 2, 3].map((i) => readTargetRow(formData, i)).filter((t) => t !== null);
  if (targets.length === 0) {
    return { error: "Au moins une ligne de ciblage est requise." };
  }

  try {
    await saveMediaFiles(formData, announcementId);
  } catch (error) {
    if (error instanceof InvalidMediaError) return { error: error.message };
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.announcement.update({
      where: { id: announcementId },
      data: { title: title.trim(), body: body.trim() },
    });
    // Repart de zéro sur le ciblage, comme pour createAnnouncement — plus
    // simple et plus sûr que de diffuser un patch partiel des lignes.
    await tx.announcementTarget.deleteMany({ where: { announcementId } });
    await tx.announcementTarget.createMany({
      data: targets.map((t) => ({ announcementId, ...t })),
    });
  });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.UPDATE_ANNOUNCEMENT,
    targetType: "Announcement",
    targetId: announcementId,
  });

  revalidatePath("/admin/annonces");
  redirect("/admin/annonces");
}

export async function deleteAnnouncementMediaItem(mediaId: string) {
  const session = await requireSuperAdmin();

  const media = await prisma.announcementMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  await prisma.announcementMedia.delete({ where: { id: mediaId } });
  await deleteAnnouncementMediaFile(media.url);

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.UPDATE_ANNOUNCEMENT,
    targetType: "AnnouncementMedia",
    targetId: mediaId,
    metadata: { announcementId: media.announcementId },
  });

  revalidatePath(`/admin/annonces/${media.announcementId}/modifier`);
}

export async function deleteAnnouncement(announcementId: string) {
  const session = await requireSuperAdmin();

  const announcement = await prisma.announcement.findUniqueOrThrow({
    where: { id: announcementId },
    include: { media: true },
  });

  // Supprimé en base d'abord (cascade sur targets/reads/media), fichiers
  // physiques nettoyés ensuite en best-effort.
  await prisma.announcement.delete({ where: { id: announcementId } });
  await Promise.all(announcement.media.map((m) => deleteAnnouncementMediaFile(m.url)));

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.DELETE_ANNOUNCEMENT,
    targetType: "Announcement",
    targetId: announcementId,
    metadata: { title: announcement.title },
  });

  revalidatePath("/admin/annonces");
}

export async function republishAnnouncement(announcementId: string) {
  const session = await requireSuperAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.announcement.update({
      where: { id: announcementId },
      data: { status: "PUBLISHED", publishAt: new Date(), expiresAt: null },
    });
    // Redonne sa visibilité à tout le monde, y compris ceux qui l'avaient
    // déjà lue/fermée — c'est tout le sens de "republier".
    await tx.announcementRead.deleteMany({ where: { announcementId } });
  });

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.REPUBLISH_ANNOUNCEMENT,
    targetType: "Announcement",
    targetId: announcementId,
  });

  revalidatePath("/admin/annonces");
}
