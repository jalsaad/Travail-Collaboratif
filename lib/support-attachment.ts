import { randomBytes } from "crypto";
import { writeStoredFile } from "@/lib/file-storage";
import {
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_TYPES,
} from "@/lib/support-attachment-formats";

const UPLOAD_PREFIX = "uploads/support";

export class InvalidAttachmentError extends Error {}

/// Validée avant la création du ticket, comme pour les logos d'école : un
/// fichier refusé rend la main sur le formulaire sans avoir rien écrit en base.
export function validateAttachment(file: File): string {
  if (file.size === 0) {
    throw new InvalidAttachmentError("Le fichier joint est vide.");
  }
  if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
    throw new InvalidAttachmentError("La pièce jointe ne doit pas dépasser 5 Mo.");
  }
  const ext = SUPPORT_ATTACHMENT_TYPES[file.type];
  if (!ext) {
    throw new InvalidAttachmentError("Format non supporté : PNG, JPEG, WEBP, GIF ou PDF uniquement.");
  }
  return ext;
}

/// Le nom d'enregistrement est tiré au sort et ne doit rien à celui fourni par
/// l'utilisateur : ni traversée de chemin, ni URL devinable à partir de
/// l'identifiant du ticket. Le nom d'origine est renvoyé à part, pour
/// l'affichage seul.
export async function saveSupportAttachment(file: File): Promise<{ url: string; name: string }> {
  const ext = validateAttachment(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await writeStoredFile(
    `${UPLOAD_PREFIX}/${randomBytes(16).toString("hex")}.${ext}`,
    buffer,
    file.type
  );
  return { url, name: sanitizeName(file.name) };
}

/// Ce nom est réaffiché dans l'administration : on n'y garde que de quoi
/// reconnaître le fichier, sans chemin ni caractère de contrôle.
function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "piece-jointe";
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) || "piece-jointe";
}
