import { randomUUID } from "crypto";
import type { MediaType } from "@prisma/client";
import { writeStoredFile, deleteStoredFile, storedUrlToKey } from "@/lib/file-storage";

const UPLOAD_PREFIX = "uploads/announcements";
const MAX_SIZE_BYTES = 30 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, { ext: string; type: MediaType }> = {
  "image/png": { ext: "png", type: "IMAGE" },
  "image/jpeg": { ext: "jpg", type: "IMAGE" },
  "image/webp": { ext: "webp", type: "IMAGE" },
  "image/gif": { ext: "gif", type: "IMAGE" },
  "video/mp4": { ext: "mp4", type: "VIDEO" },
  "video/webm": { ext: "webm", type: "VIDEO" },
  "video/ogg": { ext: "ogv", type: "VIDEO" },
  "audio/mpeg": { ext: "mp3", type: "AUDIO" },
  "audio/ogg": { ext: "oga", type: "AUDIO" },
  "audio/wav": { ext: "wav", type: "AUDIO" },
  "audio/webm": { ext: "weba", type: "AUDIO" },
};

export class InvalidMediaError extends Error {}

// Nom de fichier dérivé d'un UUID généré côté serveur — jamais du nom fourni
// par l'utilisateur, aucun risque de traversée de chemin.
export async function saveAnnouncementMedia(
  file: File
): Promise<{ url: string; mimeType: string; type: MediaType }> {
  if (file.size === 0) {
    throw new InvalidMediaError("Fichier vide.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new InvalidMediaError("Chaque fichier ne doit pas dépasser 30 Mo.");
  }
  const allowed = ALLOWED_TYPES[file.type];
  if (!allowed) {
    throw new InvalidMediaError(
      "Format non supporté (images PNG/JPEG/WEBP/GIF, vidéos MP4/WEBM/OGG, audio MP3/OGG/WAV/WEBM)."
    );
  }

  const fileName = `${randomUUID()}.${allowed.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await writeStoredFile(`${UPLOAD_PREFIX}/${fileName}`, buffer, file.type);

  return { url, mimeType: file.type, type: allowed.type };
}

export async function deleteAnnouncementMediaFile(url: string) {
  await deleteStoredFile(storedUrlToKey(url));
}
