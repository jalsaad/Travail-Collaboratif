import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { BRAND_600, escapeHtml, renderBrandedEmail } from "@/lib/email-template";

/// Réexporté pour les appelants historiques : le gabarit vit désormais dans
/// lib/email-template.ts, importable hors requête (cf. scripts/inviter-directions.ts).
export type { EmailRow } from "@/lib/email-template";

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
/// Transport SMTP partagé. Retourne null quand SMTP_HOST n'est pas configuré
/// (développement local) — l'appelant journalise alors au lieu d'envoyer.
function createTransport() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });
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

  const html = renderBrandedEmail({
    eyebrow: "Travail collaboratif",
    title: `${escapeHtml(inviterCivility)} vous invite à valider votre participation à ${escapeHtml(dureePeriodes)} période(s) de travail collaboratif.`,
    rows: [
      { label: "École", value: schoolName },
      { label: "Date", value: horaire ? `${dateLabel} · ${horaire}` : dateLabel },
      { label: "Durée", value: `${dureePeriodes} période(s)` },
      { label: "Type", value: typeLabel },
      { label: "Objet", value: description },
    ],
    cta: {
      label: "Valider ma participation",
      url: confirmUrl,
      note: "Ce bouton ouvre une page récapitulative : rien n'est validé tant que vous n'avez pas confirmé.",
    },
    footerHtml: `Vous pouvez aussi valider depuis « Mes périodes » sur
          <a href="${platformUrl}" style="color:${BRAND_600};">travail-collaboratif.be</a>.
          Le lien ci-dessus est valable 30 jours ; passé ce délai, la validation reste possible sur la plateforme.`,
  });

  await createTransport()!.sendMail({ from: SMTP_FROM, to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Notification à la direction : nouveau rattachement d'enseignant
// ---------------------------------------------------------------------------

export type NewMemberNotification = {
  /// Direction et référent·es numériques de l'école — les deux rôles qui
  /// gèrent l'établissement (cf. lib/school-authorization.ts).
  to: string[];
  memberName: string;
  memberEmail: string;
  schoolName: string;
  /// Niveaux et disciplines déclarés au rattachement, en une ligne lisible.
  teachingSummary: string;
  joinedAtLabel: string;
  membersUrl: string;
};

export async function sendNewMemberNotification(params: NewMemberNotification) {
  const { to, memberName, memberEmail, schoolName, teachingSummary, joinedAtLabel, membersUrl } =
    params;
  if (to.length === 0) return;

  const subject = `Nouveau rattachement : ${memberName} — ${schoolName}`;
  const text = [
    `${memberName} <${memberEmail}> vient de rejoindre ${schoolName}.`,
    ``,
    `Rattachement : ${joinedAtLabel}`,
    `Enseignement déclaré : ${teachingSummary}`,
    ``,
    `Consulter la liste des membres : ${membersUrl}`,
  ].join("\n");

  const transporter = createTransport();
  if (!transporter) {
    console.log(`[dev] Nouveau rattachement ${memberName} à ${schoolName} — destinataires : ${to.join(", ")}`);
    return;
  }

  const html = renderBrandedEmail({
    eyebrow: "Espace direction",
    title: `${escapeHtml(memberName)} vient de rejoindre ${escapeHtml(schoolName)}.`,
    rows: [
      { label: "Enseignant·e", value: memberName },
      { label: "Email", value: memberEmail },
      { label: "Rattachement", value: joinedAtLabel },
      { label: "Enseignement", value: teachingSummary },
    ],
    cta: { label: "Voir les membres de l'école", url: membersUrl },
    footerHtml: `Ce rattachement s'est fait via le code d'accès de l'école. Si cette personne
          n'aurait pas dû y accéder, vous pouvez la retirer depuis la liste des membres et
          régénérer le code dans les paramètres.`,
  });

  await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Notification à la plateforme : nouvelle inscription d'école
// ---------------------------------------------------------------------------

/// Destinataire des notifications plateforme. Configurable pour ne pas figer
/// une adresse dans le code, mais l'adresse de service reste le défaut.
export function platformNotificationRecipient(): string {
  return process.env.PLATFORM_NOTIFICATION_EMAIL || "admin@travail-collaboratif.be";
}

export type NewSchoolNotification = {
  schoolName: string;
  numeroFase: string | null;
  reseau: string | null;
  locality: string | null;
  founderName: string;
  founderEmail: string;
  founderFonction: string | null;
  adminUrl: string;
};

export async function sendNewSchoolNotification(params: NewSchoolNotification) {
  const {
    schoolName,
    numeroFase,
    reseau,
    locality,
    founderName,
    founderEmail,
    founderFonction,
    adminUrl,
  } = params;
  const to = platformNotificationRecipient();

  const subject = `Nouvelle école à valider : ${schoolName}`;
  const text = [
    `${founderName} <${founderEmail}> a inscrit l'école « ${schoolName} ».`,
    ``,
    `N° FASE : ${numeroFase ?? "non renseigné"}`,
    `Réseau : ${reseau ?? "non renseigné"}`,
    `Localité : ${locality ?? "non renseignée"}`,
    `Fonction du fondateur : ${founderFonction ?? "non renseignée"}`,
    ``,
    `L'école reste en attente de validation et n'est pas opérationnelle tant que`,
    `la plateforme ne l'a pas approuvée : ${adminUrl}`,
  ].join("\n");

  const transporter = createTransport();
  if (!transporter) {
    console.log(`[dev] Nouvelle école « ${schoolName} » à valider — destinataire : ${to}`);
    return;
  }

  const html = renderBrandedEmail({
    eyebrow: "Administration plateforme",
    title: `${escapeHtml(founderName)} a inscrit l'école ${escapeHtml(schoolName)}.`,
    rows: [
      { label: "École", value: schoolName },
      { label: "N° FASE", value: numeroFase ?? "non renseigné" },
      { label: "Réseau", value: reseau ?? "non renseigné" },
      { label: "Localité", value: locality ?? "non renseignée" },
      { label: "Fondateur", value: `${founderName} (${founderEmail})` },
      { label: "Fonction", value: founderFonction ?? "non renseignée" },
    ],
    cta: { label: "Examiner la demande", url: adminUrl },
    footerHtml: `L'école est enregistrée avec le statut « en attente » : ses membres n'ont accès
          à aucune fonctionnalité tant que la plateforme ne l'a pas approuvée.`,
  });

  await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Rappel de remise du travail collaboratif
// ---------------------------------------------------------------------------

export type TeacherReminderEmail = {
  /// Enseignant·es de l'école. Mis en copie cachée : ils n'ont pas à voir
  /// l'adresse de leurs collègues, et un envoi unique évite d'ouvrir autant de
  /// connexions SMTP que de destinataires.
  recipients: string[];
  schoolName: string;
  /// « Madame Dubois » / « Monsieur Lefèvre » — cf. lib/civility.ts.
  senderCivility: string;
  message: string;
  daysLeft: number;
  deadlineLabel: string;
  periodsUrl: string;
};

export async function sendTeacherReminderEmail(params: TeacherReminderEmail) {
  const {
    recipients,
    schoolName,
    senderCivility,
    message,
    daysLeft,
    deadlineLabel,
    periodsUrl,
  } = params;
  if (recipients.length === 0) return;

  const joursLabel = `${daysLeft} jour${daysLeft > 1 ? "s" : ""}`;
  const subject = `Rappel — travail collaboratif à remettre sous ${joursLabel}`;

  const text = [
    `${senderCivility} vous rappelle de mettre à jour vos périodes de travail collaboratif.`,
    ``,
    `École : ${schoolName}`,
    `Il vous reste ${joursLabel}, jusqu'au ${deadlineLabel}.`,
    ``,
    message,
    ``,
    `Déclarer vos périodes : ${periodsUrl}`,
  ].join("\n");

  const transporter = createTransport();
  if (!transporter) {
    console.log(
      `[dev] Rappel « ${schoolName} » (${joursLabel}) — destinataires : ${recipients.join(", ")}`
    );
    return;
  }

  const html = renderBrandedEmail({
    eyebrow: "Rappel de votre direction",
    title: `Il vous reste <span style="color:${BRAND_600};">${escapeHtml(joursLabel)}</span> pour mettre à jour vos périodes de travail collaboratif.`,
    rows: [
      { label: "École", value: schoolName },
      { label: "De", value: senderCivility },
      { label: "Échéance", value: `${deadlineLabel} (${joursLabel})` },
      { label: "Message", value: message },
    ],
    cta: { label: "Déclarer mes périodes", url: periodsUrl },
    footerHtml: `Ce rappel a été émis par la direction de votre école et expire automatiquement
          à l'échéance indiquée.`,
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    // Le destinataire visible est l'expéditeur : les enseignant·es sont en
    // copie cachée, aucun ne voit la liste des autres.
    to: SMTP_FROM,
    bcc: recipients,
    subject,
    text,
    html,
  });
}
