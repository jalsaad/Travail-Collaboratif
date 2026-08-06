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

const SUPPORT_CATEGORY_LABEL = { ASSISTANCE: "Demande d'assistance", INCIDENT: "Signalement d'incident" };

// Envoyée à tous les administrateurs plateforme (User.isSuperAdmin) à la
// création d'un ticket (cf. app/(app)/assistance/actions.ts) — même fallback
// console en dev que sendPasswordResetEmail, pas de nouvelle variable
// d'environnement dédiée.
export async function sendSupportTicketNotification(params: {
  to: string[];
  category: "ASSISTANCE" | "INCIDENT";
  subject: string;
  message: string;
  requesterName: string;
  requesterEmail: string;
  adminUrl: string;
}) {
  const { to, category, subject, message, requesterName, requesterEmail, adminUrl } = params;
  const categoryLabel = SUPPORT_CATEGORY_LABEL[category];

  if (to.length === 0) return;

  if (!SMTP_HOST) {
    console.log(
      `[dev] Nouveau ticket (${categoryLabel}) de ${requesterName} <${requesterEmail}> : "${subject}" — destinataires : ${to.join(", ")} — ${adminUrl}`
    );
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
    subject: `[${categoryLabel}] ${subject}`,
    text: `${requesterName} <${requesterEmail}> a ouvert un ticket (${categoryLabel}) :\n\n${subject}\n\n${message}\n\nVoir dans l'administration : ${adminUrl}`,
    html: `
      <p><strong>${requesterName}</strong> (${requesterEmail}) a ouvert un ticket — ${categoryLabel}.</p>
      <p><strong>${subject}</strong></p>
      <p>${message.replace(/\n/g, "<br/>")}</p>
      <p><a href="${adminUrl}">Voir dans l'administration</a></p>
    `,
  });
}

// ---------------------------------------------------------------------------
// Invitation à valider une participation
// ---------------------------------------------------------------------------

// Gabarit HTML en tableaux et styles en ligne : Outlook ignore les feuilles de
// style externes et gère mal flexbox/grid. Les couleurs reprennent celles de
// la plateforme (--color-brand-600 et --color-brand-teal de app/globals.css).
const BRAND_600 = "#1f6fc4";
const BRAND_TEAL = "#14b8a6";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ParticipationInvitationEmail = {
  to: string;
  /// « Madame Dubois » / « Monsieur Lefèvre » — cf. lib/civility.ts.
  inviterCivility: string;
  /// Durée déjà formatée à la française (cf. formatPeriodes).
  dureePeriodes: string;
  dateLabel: string;
  /// « 09:00 – 10:40 », ou null pour les périodes sans plage horaire.
  horaire: string | null;
  typeLabel: string;
  description: string;
  schoolName: string;
  /// Page de confirmation portant le jeton — ne valide rien par elle-même.
  confirmUrl: string;
  platformUrl: string;
};

export async function sendParticipationInvitationEmail(params: ParticipationInvitationEmail) {
  const {
    to,
    inviterCivility,
    dureePeriodes,
    dateLabel,
    horaire,
    typeLabel,
    description,
    schoolName,
    confirmUrl,
    platformUrl,
  } = params;

  const subject = `${inviterCivility} vous invite à valider ${dureePeriodes} période(s) de travail collaboratif`;

  const text = [
    `${inviterCivility} vous invite à valider votre participation à ${dureePeriodes} période(s) de travail collaboratif.`,
    ``,
    `École : ${schoolName}`,
    `Date : ${dateLabel}${horaire ? ` (${horaire})` : ""}`,
    `Type : ${typeLabel}`,
    `Objet : ${description}`,
    ``,
    `Pour confirmer votre participation, ouvrez ce lien (valable 30 jours) :`,
    confirmUrl,
    ``,
    `Vous pouvez aussi vous connecter à ${platformUrl} et valider depuis « Mes périodes ».`,
  ].join("\n");

  if (!SMTP_HOST) {
    console.log(`[dev] Invitation à valider une participation pour ${to} : ${confirmUrl}`);
    return;
  }

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:4px 12px 4px 0;color:#78716c;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;color:#1c1917;font-size:13px;">${escapeHtml(value)}</td>
    </tr>`;

  const html = `
<div style="margin:0;padding:24px 12px;background:#fafaf9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="height:6px;background:${BRAND_600};background-image:linear-gradient(90deg,${BRAND_600},${BRAND_TEAL});font-size:0;line-height:6px;">&nbsp;</td>
    </tr>
    <tr>
      <td style="padding:28px 28px 8px 28px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${BRAND_600};">Travail collaboratif</p>
        <h1 style="margin:0;font-size:19px;line-height:1.35;color:#1c1917;font-weight:600;">
          ${escapeHtml(inviterCivility)} vous invite à valider votre participation à ${escapeHtml(dureePeriodes)} période(s) de travail collaboratif.
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 4px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:14px 16px;">
          ${row("École", schoolName)}
          ${row("Date", horaire ? `${dateLabel} · ${horaire}` : dateLabel)}
          ${row("Durée", `${dureePeriodes} période(s)`)}
          ${row("Type", typeLabel)}
          ${row("Objet", description)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 28px 6px 28px;" align="center">
        <a href="${confirmUrl}" style="display:inline-block;padding:13px 26px;background:${BRAND_600};background-image:linear-gradient(90deg,${BRAND_600},${BRAND_TEAL});color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
          Valider ma participation
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#78716c;">
          Ce bouton ouvre une page récapitulative : rien n'est validé tant que vous n'avez pas confirmé.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 28px 28px 28px;border-top:1px solid #f5f5f4;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#78716c;">
          Vous pouvez aussi valider depuis « Mes périodes » sur
          <a href="${platformUrl}" style="color:${BRAND_600};">travail-collaboratif.be</a>.
          Le lien ci-dessus est valable 30 jours ; passé ce délai, la validation reste possible sur la plateforme.
        </p>
      </td>
    </tr>
  </table>
</div>`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });

  await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
}
