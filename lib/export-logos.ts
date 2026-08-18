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
  const extension = EXTENSION_MAP[match[1].toLowerCase()];
  if (!extension) return null;
  const buffer = await readStoredFile(storedUrlToKey(logoUrl));
  return buffer ? { buffer, extension, ...readImageSize(buffer, extension) } : null;
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
