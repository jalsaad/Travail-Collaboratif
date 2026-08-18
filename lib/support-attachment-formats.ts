// Formats acceptés en pièce jointe d'un ticket d'assistance, isolés du module
// qui écrit les fichiers : le formulaire est un composant client, et importer
// lib/support-attachment.ts depuis le navigateur y ferait entrer le SDK S3 et
// `fs` (cf. lib/file-storage.ts). Ici, rien que des chaînes.
//
// Une pièce jointe d'assistance est presque toujours une capture d'écran ; le
// PDF couvre les courriers de l'administration qu'on nous transfère. SVG exclu
// comme pour les logos (cf. lib/school-logo.ts) : il peut embarquer du script,
// et ces fichiers sont servis tels quels. Aucun format bureautique : rien
// n'oblige à ouvrir un .docx pour comprendre un incident, et l'accepter ferait
// entrer des macros dans la boîte du support.
export const SUPPORT_ATTACHMENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export const SUPPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

/// Valeur de l'attribut `accept` du champ de fichier.
export const SUPPORT_ATTACHMENT_ACCEPT = Object.keys(SUPPORT_ATTACHMENT_TYPES).join(",");

export const SUPPORT_ATTACHMENT_HINT = "PNG, JPEG, WEBP, GIF ou PDF — 5 Mo maximum.";
