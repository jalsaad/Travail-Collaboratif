import { readFile } from "fs/promises";
import { join } from "path";
import { readStoredFile, storedUrlToKey } from "@/lib/file-storage";

export type LoadedLogo = { buffer: Buffer; extension: "png" | "jpeg" };

// pdfkit n'embarque que du PNG/JPEG — un logo école importé en GIF ou WEBP
// (cf. lib/school-logo.ts ALLOWED_TYPES) est silencieusement omis de
// l'en-tête plutôt que de faire échouer tout l'export.
const EXTENSION_MAP: Record<string, "png" | "jpeg" | undefined> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
};

const SCHOOL_LOGO_PATTERN = /(?:^|\/)uploads\/schools\/[a-zA-Z0-9_-]+\.([a-z]+)$/;

// Assets statiques livrés avec l'app (jamais uploadés par un utilisateur) —
// toujours lus sur le disque du build, quel que soit le stockage configuré
// pour les fichiers uploadés (cf. lib/file-storage.ts).
async function readBundledAsset(relativePath: string, extension: "png" | "jpeg"): Promise<LoadedLogo | null> {
  try {
    const buffer = await readFile(join(process.cwd(), "public", relativePath));
    return { buffer, extension };
  } catch {
    return null;
  }
}

// Même invariant que components/school-logo-badge.tsx : une école qui n'a
// pas encore importé son propre logo affiche TC3d.png en substitution,
// jamais un en-tête d'export amputé.
function loadSubstituteLogo(): Promise<LoadedLogo | null> {
  return readBundledAsset("TC3d.png", "png");
}

// Le logo propre à l'école, lui, est un fichier uploadé — potentiellement
// sur un stockage objet (Cellar/S3) plutôt que sur le disque local en
// production, d'où le passage par lib/file-storage.ts.
async function loadUploadedSchoolLogo(logoUrl: string): Promise<LoadedLogo | null> {
  const match = logoUrl.split("?")[0].match(SCHOOL_LOGO_PATTERN);
  if (!match) return null; // jamais un chemin hors du format généré par saveSchoolLogo
  const extension = EXTENSION_MAP[match[1].toLowerCase()];
  if (!extension) return null;
  const buffer = await readStoredFile(storedUrlToKey(logoUrl));
  return buffer ? { buffer, extension } : null;
}

// Les deux logos des documents PDF : celui de l'école (ou sa substitution),
// qui coiffe le document, et celui de la plateforme, qui en signe le pied.
// Nommés par leur rôle et non par leur position : celle-ci a changé une fois
// déjà, l'affiche et les relevés ne les placent pas au même endroit.
export async function loadExportHeaderLogos(schoolLogoUrl: string | null) {
  const [uploaded, platform] = await Promise.all([
    schoolLogoUrl ? loadUploadedSchoolLogo(schoolLogoUrl) : Promise.resolve(null),
    readBundledAsset("LogoTCvertical.png", "png"),
  ]);
  const school = uploaded ?? (await loadSubstituteLogo());
  return { school, platform };
}
