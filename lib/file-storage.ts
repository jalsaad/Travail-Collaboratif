import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Abstraction disque local / stockage objet S3-compatible (Cellar, OVH
// Object Storage, Scaleway...) pour les fichiers UPLOADÉS par les
// utilisateurs (logos d'école, médias d'annonces). Ne concerne jamais les
// assets statiques livrés avec l'app (TC3d.png, LogoTCvertical.png...), qui
// restent sur le disque du build quel que soit l'environnement.
//
// Bascule automatique : si S3_ENDPOINT/S3_BUCKET ne sont pas renseignés
// (développement local sans compte S3), on écrit sur le disque sous
// public/ exactement comme avant — même code en dev et en prod, pas de
// dépendance à un compte cloud pour travailler en local.
//
// Toutes les fonctions manipulent une "clé" relative (ex:
// "uploads/schools/abc123.png"), jamais une URL complète ni un chemin
// absolu — la conversion URL -> clé se fait via storedUrlToKey.

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");

const s3Client =
  S3_ENDPOINT && S3_BUCKET
    ? new S3Client({
        endpoint: S3_ENDPOINT,
        region: process.env.S3_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        },
        forcePathStyle: true,
      })
    : null;

export const usingObjectStorage = s3Client !== null;

export async function writeStoredFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (s3Client && S3_BUCKET) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
      })
    );
    return S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL}/${key}` : `/${key}`;
  }

  const localPath = join(process.cwd(), "public", key);
  await mkdir(join(localPath, ".."), { recursive: true });
  await writeFile(localPath, buffer);
  return `/${key}`;
}

// Best effort : un fichier déjà absent (ou une erreur réseau transitoire sur
// le stockage objet) ne doit jamais faire échouer l'opération appelante
// (suppression d'un enregistrement en base, remplacement d'un logo...).
export async function deleteStoredFile(key: string): Promise<void> {
  if (s3Client && S3_BUCKET) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })).catch(() => {});
    return;
  }
  await unlink(join(process.cwd(), "public", key)).catch(() => {});
}

export async function readStoredFile(key: string): Promise<Buffer | null> {
  try {
    if (s3Client && S3_BUCKET) {
      const res = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    }
    return await readFile(join(process.cwd(), "public", key));
  } catch {
    return null;
  }
}

// Convertit une URL renvoyée par writeStoredFile (avec ou sans query string
// de cache-busting) en clé brute réutilisable par deleteStoredFile/
// readStoredFile.
export function storedUrlToKey(url: string): string {
  const withoutQuery = url.split("?")[0];
  if (S3_PUBLIC_BASE_URL && withoutQuery.startsWith(S3_PUBLIC_BASE_URL)) {
    return withoutQuery.slice(S3_PUBLIC_BASE_URL.length + 1);
  }
  return withoutQuery.replace(/^\//, "");
}
