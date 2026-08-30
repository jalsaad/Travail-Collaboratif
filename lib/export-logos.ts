import { readFile } from "fs/promises";
import { join } from "path";
import { readStoredFile, storedUrlToKey } from "@/lib/file-storage";

export type LoadedLogo = {
  buffer: Buffer;
  extension: "png" | "jpeg";
  /// Dimensions intrinsèques, lues dans l'en-tête du fichier. Elles servent à
  /// savoir quelle largeur le logo occupera réellement une fois réduit à
  /// hauteur constante — pdfkit expose bien `openImage`, mais pas dans ses
  /// définitions de types.
  width: number;
  height: number;
};

/// Dimensions d'un PNG (IHDR, toujours le premier bloc) ou d'un JPEG (premier
/// marqueur SOF rencontré). Un fichier illisible renvoie un carré : le logo
/// s'affichera quand même, seul le calcul de place environnante sera approché.
function readImageSize(buffer: Buffer, extension: "png" | "jpeg"): { width: number; height: number } {
  try {
    if (extension === "png") {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    // JPEG : parcours des marqueurs jusqu'au Start Of Frame, qui porte les
    // dimensions. Les marqueurs SOF sont 0xC0-0xCF, hors 0xC4 (tables de
    // Huffman), 0xC8 (extension JPEG) et 0xCC (codage arithmétique).
    let i = 2;
    while (i < buffer.length - 9) {
      if (buffer[i] !== 0xff) {
        i++;
        continue;
      }
      const marqueur = buffer[i + 1];
      if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
        return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
      }
      i += 2 + buffer.readUInt16BE(i + 2);
    }
  } catch {
    // en-tête tronqué ou inattendu : on retombe sur le carré ci-dessous
  }
  return { width: 1, height: 1 };
}

// pdfkit n'embarque que du PNG et du JPEG, qu'il lit tels quels.
const EXTENSION_MAP: Record<string, "png" | "jpeg" | undefined> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
};

// Les deux autres formats acceptés à l'import (cf. lib/school-logo.ts
// ALLOWED_TYPES) sont convertis en PNG à la volée : ils étaient auparavant
// écartés en silence, et l'école se retrouvait avec le logo de substitution
// sur ses relevés sans jamais comprendre pourquoi.
const CONVERTIBLE_EXTENSIONS = new Set(["webp", "gif"]);

/// Conversion en PNG via sharp — module natif, chargé à la demande pour ne
/// pas le tirer dans les exports qui n'en ont pas besoin (la grande majorité,
/// les logos étant le plus souvent déjà en PNG). Un échec rend null : le logo
/// de substitution prend alors le relais, comme avant.
async function convertToPng(buffer: Buffer): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    // Une image animée (GIF, WEBP animé) donne ici sa première image : un
    // logo n'a pas à s'animer sur un relevé imprimé.
    return await sharp(buffer).png().toBuffer();
  } catch (error) {
    console.error("[export-logos] Conversion du logo en PNG impossible :", error);
    return null;
  }
}

const SCHOOL_LOGO_PATTERN = /(?:^|\/)uploads\/schools\/[a-zA-Z0-9_-]+\.([a-z]+)$/;

// Assets statiques livrés avec l'app (jamais uploadés par un utilisateur) —
// toujours lus sur le disque du build, quel que soit le stockage configuré
// pour les fichiers uploadés (cf. lib/file-storage.ts).
async function readBundledAsset(relativePath: string, extension: "png" | "jpeg"): Promise<LoadedLogo | null> {
  try {
    const buffer = await readFile(join(process.cwd(), "public", relativePath));
    return { buffer, extension, ...readImageSize(buffer, extension) };
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

  const rawExtension = match[1].toLowerCase();
  const directExtension = EXTENSION_MAP[rawExtension];
  if (!directExtension && !CONVERTIBLE_EXTENSIONS.has(rawExtension)) return null;

  const buffer = await readStoredFile(storedUrlToKey(logoUrl));
  if (!buffer) return null;

  if (directExtension) {
    return { buffer, extension: directExtension, ...readImageSize(buffer, directExtension) };
  }

  const png = await convertToPng(buffer);
  // Dimensions relues sur le PNG produit, pas sur la source : la conversion
  // peut les changer (une image animée y perd ses images suivantes, et sharp
  // applique l'orientation EXIF quand il y en a une).
  return png ? { buffer: png, extension: "png", ...readImageSize(png, "png") } : null;
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
