import { writeStoredFile, deleteStoredFile } from "@/lib/file-storage";

const UPLOAD_PREFIX = "uploads/schools";
const MAX_SIZE_BYTES = 3 * 1024 * 1024;

// svg volontairement exclu : un SVG peut embarquer du script, dangereux à
// servir tel quel depuis /public sans sanitisation dédiée.
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export class InvalidLogoError extends Error {}

// Nom de fichier dérivé uniquement du schoolId (jamais du nom fourni par
// l'utilisateur) — aucun risque de traversée de chemin. Le paramètre v
// (query string) sert uniquement à invalider le cache navigateur puisque le
// nom de fichier est stable d'un envoi à l'autre.
export async function saveSchoolLogo(schoolId: string, file: File): Promise<string> {
  if (file.size === 0) {
    throw new InvalidLogoError("Fichier vide.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new InvalidLogoError("Le logo ne doit pas dépasser 3 Mo.");
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new InvalidLogoError("Format non supporté (PNG, JPEG, WEBP ou GIF uniquement).");
  }

  // Supprime les anciennes variantes (extension différente d'un envoi à
  // l'autre) pour ne pas accumuler de fichiers orphelins.
  await Promise.all(
    Object.values(ALLOWED_TYPES).map((otherExt) =>
      deleteStoredFile(`${UPLOAD_PREFIX}/${schoolId}.${otherExt}`)
    )
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await writeStoredFile(`${UPLOAD_PREFIX}/${schoolId}.${ext}`, buffer, file.type);

  return `${url}?v=${Date.now()}`;
}
