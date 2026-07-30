import nodemailer from "nodemailer";
import { headers } from "next/headers";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || "Travail Collaboratif <no-reply@travail-collaboratif.be>";

// Construit l'URL absolue à partir des headers de la requête entrante plutôt
// que d'une variable d'environnement dédiée — évite une désynchronisation
// entre l'URL réellement servie (codespaces, prod...) et une valeur figée.
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Sans SMTP_HOST configuré (dev local), le lien est simplement journalisé au
// lieu d'être envoyé — même logique que le fallback disque local de
// lib/file-storage.ts pour le stockage S3.
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!SMTP_HOST) {
    console.log(`[dev] Lien de réinitialisation de mot de passe pour ${to} : ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: "Réinitialisez votre mot de passe — Travail Collaboratif",
    text: `Vous avez demandé la réinitialisation de votre mot de passe. Ouvrez ce lien (valable 1h) pour choisir un nouveau mot de passe :\n\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a> (lien valable 1h).</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `,
  });
}
