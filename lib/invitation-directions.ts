// ---------------------------------------------------------------------------
// lib/invitation-directions.ts
// Contenu de l'invitation envoyée aux directions d'école qui n'utilisent pas
// encore la plateforme (campagne de prospection, cf. scripts/inviter-directions.ts).
// Pur : ne touche ni à la base, ni au SMTP, ce qui permet d'en générer un
// aperçu HTML sans rien envoyer.
// ---------------------------------------------------------------------------

import { BRAND_600, escapeHtml, renderBrandedEmail } from "./email-template";

/// Une ligne du fichier de prospection, réduite à ce dont l'email a besoin.
export type InvitedSchool = {
  nom: string;
  ville: string;
  codePostal: string;
  reseau: string;
  /// « Fondamental » / « Secondaire » — sert à adapter la mention du quota.
  niveau: string;
};

export type InvitationOptions = {
  school: InvitedSchool;
  /// Origine publique de la plateforme, sans slash final.
  baseUrl: string;
  /// Adresse de contact affichée dans le pied de page et utilisée pour les
  /// demandes de désinscription.
  contactEmail: string;
};

export type InvitationContent = {
  subject: string;
  text: string;
  html: string;
  /// Valeur de l'en-tête List-Unsubscribe : un envoi non sollicité doit offrir
  /// un retrait en un geste, y compris depuis les clients qui l'exposent
  /// nativement (Gmail, Outlook).
  listUnsubscribe: string;
};

const SUBJECT = "Le travail collaboratif de votre équipe, sans tableur";

export function buildDirectionInvitation(options: InvitationOptions): InvitationContent {
  const { school, baseUrl, contactEmail } = options;
  const localite = [school.codePostal, school.ville].filter(Boolean).join(" ");
  const inscriptionUrl = `${baseUrl}/creer-ecole`;

  const paragraphes = [
    "Madame la Directrice, Monsieur le Directeur,",
    "La circulaire 7167 impose à chaque enseignant·e 60 périodes annuelles de travail " +
      "collaboratif, à recenser sur le formulaire annexé. Travail Collaboratif est une " +
      "plateforme web qui prend ce recensement en charge : les enseignant·es déclarent " +
      "leurs périodes, les collègues concernés confirment leur participation, et votre " +
      "espace direction donne à tout moment l'avancement de l'équipe — avec les exports " +
      "PDF et Excel prêts à joindre au dossier.",
    "La mise en route tient en trois étapes : vous créez l'espace de votre école, la " +
      "plateforme génère une affiche A4 avec QR code à mettre en salle des profs, vos " +
      "enseignant·es s'y rattachent avec le code de l'établissement. Rien à installer.",
    "Elle est conçue par des enseignant·es, gratuite et sans limite de comptes, ouverte à " +
      "tous les réseaux et à tous les niveaux. Si l'outil peut vous faire gagner du temps " +
      "cette année, l'essai ne coûte rien.",
  ];

  const text = [
    ...paragraphes,
    "",
    `École : ${school.nom}${localite ? ` — ${localite}` : ""}`,
    `Créer l'espace de votre école : ${inscriptionUrl}`,
    "",
    `Une question ? ${contactEmail}`,
    `Vous recevez ce message parce que votre établissement figure à l'annuaire public des`,
    `écoles de la Fédération Wallonie-Bruxelles. Pour ne plus en recevoir, répondez à cet`,
    `email avec la mention DESINSCRIPTION.`,
  ].join("\n");

  const html = renderBrandedEmail({
    eyebrow: "Invitation aux directions",
    title: "Le travail collaboratif de votre équipe, suivi sans tableur.",
    bodyHtml: paragraphes
      .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`)
      .join("\n        "),
    rows: [
      { label: "École", value: school.nom },
      ...(localite ? [{ label: "Localité", value: localite }] : []),
      ...(school.reseau ? [{ label: "Réseau", value: school.reseau }] : []),
      { label: "Cadre", value: "Circulaire 7167 — 60 périodes par enseignant·e et par an" },
      { label: "Coût", value: "Gratuite, sans limite de comptes" },
    ],
    cta: {
      label: "Créer l'espace de mon école",
      url: inscriptionUrl,
      note: "L'inscription prend deux minutes ; l'école est activée après une vérification de notre part.",
    },
    footerHtml: `Une question ou une démonstration ?
          <a href="mailto:${contactEmail}" style="color:${BRAND_600};">${escapeHtml(contactEmail)}</a>.
          Vous recevez ce message parce que votre établissement figure à l'annuaire public des
          écoles de la Fédération Wallonie-Bruxelles ; pour ne plus en recevoir, répondez
          simplement « DESINSCRIPTION ».`,
  });

  return {
    subject: SUBJECT,
    text,
    html,
    listUnsubscribe: `<mailto:${contactEmail}?subject=DESINSCRIPTION>`,
  };
}
