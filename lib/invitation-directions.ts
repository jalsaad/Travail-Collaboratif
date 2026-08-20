// ---------------------------------------------------------------------------
// lib/invitation-directions.ts
// Contenu de l'invitation envoyée aux directions d'école qui n'utilisent pas
// encore la plateforme (campagne de prospection, cf. scripts/inviter-directions.ts).
// Pur : ne touche ni à la base, ni au SMTP, ce qui permet d'en générer un
// aperçu HTML sans rien envoyer.
// ---------------------------------------------------------------------------

import { BRAND_600, escapeHtml, renderBrandedEmail } from "./email-template";
import { CIRCULAIRE_7167_URL, CIRCULAIRE_8894_URL } from "./regulatory-reference";

/// Le seul paragraphe citant les deux circulaires diffère juste par sa fin
/// (direction vs pouvoir organisateur) — construit ici en deux variantes
/// (texte brut / HTML avec liens vers leur texte officiel sur Gallilex)
/// plutôt que confié à `paragraphes.map(escapeHtml)` comme les autres, même
/// principe que `liensDecouverte` ci-dessous pour les liens de découverte.
function paragrapheCirculaires(finDePhrase: string) {
  const debut =
    "Les circulaires 7167 et 8894 imposent à chaque enseignant·e 60 périodes annuelles de travail " +
    "collaboratif, à recenser sur le formulaire annexé. Travail Collaboratif est une " +
    "plateforme web qui prend ce recensement en charge : les enseignant·es déclarent " +
    "leurs périodes, les collègues concernés confirment leur participation, et ";
  return {
    texte: `${debut}${finDePhrase}`,
    html:
      `<p style="margin:0 0 12px;">Les circulaires ` +
      `<a href="${CIRCULAIRE_7167_URL}" style="color:${BRAND_600};">7167</a> et ` +
      `<a href="${CIRCULAIRE_8894_URL}" style="color:${BRAND_600};">8894</a> imposent à chaque ` +
      `enseignant·e 60 périodes annuelles de travail collaboratif, à recenser sur le formulaire ` +
      `annexé. Travail Collaboratif est une plateforme web qui prend ce recensement en charge : ` +
      `les enseignant·es déclarent leurs périodes, les collègues concernés confirment leur ` +
      `participation, et ${escapeHtml(finDePhrase)}</p>`,
  };
}

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

/// Deux campagnes, deux marques : on veut savoir laquelle amène du monde.
const SRC_DIRECTION = "invitation";
const SRC_PO = "invitation-po";

/// Marque un lien de campagne, pour que les visites qu'il amène soient
/// reconnaissables dans le journal du serveur — c'est la seule façon de mesurer
/// ce qu'une vague d'invitations produit vraiment. Un référent d'email est
/// inexploitable : la plupart des clients n'en envoient pas.
///
/// `src` plutôt que les `utm_*` de Google Analytics : la plateforme n'utilise
/// aucun traceur, l'analyse se fait sur les journaux Nginx (cf. ops/goaccess),
/// et un paramètre court reste lisible dans une barre d'adresse.
function marquer(url: string, source: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}src=${source}`;
}

/// Deux liens de découverte, offerts à qui ne veut pas s'inscrire d'emblée :
/// le site pour se faire une idée, le guide pour voir à quoi ressemble
/// l'espace direction avant de créer quoi que ce soit. Le bouton principal
/// mène à l'inscription ; ces liens-ci sont la porte basse.
///
/// Construits sur `baseUrl` plutôt qu'écrits en dur : l'adresse de la
/// plateforme se règle par APP_ORIGIN, et un lien qui la contredirait
/// enverrait les destinataires sur un autre hôte que le bouton.
function liensDecouverte(baseUrl: string, source: string) {
  const site = marquer(baseUrl, source);
  const guide = marquer(`${baseUrl}/guides/guide-direction.html`, source);
  return {
    site,
    guide,
    /// Sans le schéma : c'est l'usage dans un corps de texte, et cela raccourcit
    /// une ligne déjà longue.
    siteLabel: site.replace(/^https?:\/\//, ""),
    texte: [`Découvrir la plateforme : ${site}`, `Guide de prise en main pour les directions : ${guide}`],
    html:
      `<p style="margin:0 0 12px;">Pour vous faire une idée avant de vous décider : ` +
      `<a href="${site}" style="color:${BRAND_600};">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>, ` +
      `et le <a href="${guide}" style="color:${BRAND_600};">guide de prise en main destiné aux directions</a>.</p>`,
  };
}

export function buildDirectionInvitation(options: InvitationOptions): InvitationContent {
  const { school, baseUrl, contactEmail } = options;
  const localite = [school.codePostal, school.ville].filter(Boolean).join(" ");
  const inscriptionUrl = marquer(`${baseUrl}/creer-ecole`, SRC_DIRECTION);

  const circulaires = paragrapheCirculaires(
    "votre espace direction donne à tout moment l'avancement de l'équipe — avec les exports " +
      "PDF et Excel prêts à joindre au dossier."
  );

  const paragraphes = [
    "Madame la Directrice, Monsieur le Directeur,",
    circulaires.texte,
    "La mise en route tient en trois étapes : vous créez l'espace de votre école, la " +
      "plateforme génère une affiche A4 avec QR code à mettre en salle des profs, vos " +
      "enseignant·es s'y rattachent avec le code de l'établissement. Rien à installer.",
    "Elle est conçue par des enseignant·es, gratuite et sans limite de comptes, ouverte à " +
      "tous les réseaux et à tous les niveaux. Si l'outil peut vous faire gagner du temps " +
      "cette année, l'essai ne coûte rien.",
  ];

  const liens = liensDecouverte(baseUrl, SRC_DIRECTION);

  const text = [
    ...paragraphes,
    "",
    `École : ${school.nom}${localite ? ` — ${localite}` : ""}`,
    `Créer l'espace de votre école : ${inscriptionUrl}`,
    ...liens.texte,
    "",
    `Une question ? ${contactEmail}`,
    `Vous recevez ce message parce que votre établissement figure à l'annuaire public des`,
    `écoles de la Fédération Wallonie-Bruxelles. Pour ne plus en recevoir, répondez à cet`,
    `email avec la mention DESINSCRIPTION.`,
  ].join("\n");

  // Toutes les phrases via escapeHtml, sauf celle qui cite les circulaires
  // (paragraphes[1]) : c'est là qu'on veut des liens, cf. paragrapheCirculaires.
  const bodyHtml =
    [
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[0])}</p>`,
      circulaires.html,
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[2])}</p>`,
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[3])}</p>`,
    ].join("\n        ") +
    "\n        " +
    liens.html;

  const html = renderBrandedEmail({
    eyebrow: "Invitation aux directions",
    title: "Le travail collaboratif de votre équipe, suivi sans tableur.",
    bodyHtml,
    rows: [
      { label: "École", value: school.nom },
      ...(localite ? [{ label: "Localité", value: localite }] : []),
      ...(school.reseau ? [{ label: "Réseau", value: school.reseau }] : []),
      { label: "Cadre", value: "Circulaires 7167 et 8894 — 60 périodes par enseignant·e et par an" },
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

// ---------------------------------------------------------------------------
// Variante adressée au pouvoir organisateur
// ---------------------------------------------------------------------------

/// Une ligne de data/prospection-po.csv, réduite à ce dont l'email a besoin.
export type InvitedPo = {
  nom: string;
  localite: string;
  /// Nombre d'écoles de notre liste rattachées à ce PO — c'est l'argument
  /// principal : un PO ne se décide pas école par école.
  nbEcoles: number;
  /// Vrai quand le PO est une commune ou une ville : l'interlocuteur est alors
  /// l'échevin·e de l'enseignement, membre du collège communal qui exerce le
  /// pouvoir organisateur.
  estCommune: boolean;
};

const SUJET_PO = "Travail collaboratif : un outil gratuit pour les écoles de votre pouvoir organisateur";

export function buildPoInvitation(options: {
  po: InvitedPo;
  baseUrl: string;
  contactEmail: string;
}): InvitationContent {
  const { po, baseUrl, contactEmail } = options;
  const inscriptionUrl = marquer(`${baseUrl}/creer-ecole`, SRC_PO);
  const ecolesLabel = `${po.nbEcoles} école${po.nbEcoles > 1 ? "s" : ""}`;

  const circulaires = paragrapheCirculaires(
    "chaque direction suit l'avancement de son équipe, exports PDF et Excel compris."
  );

  const paragraphes = [
    po.estCommune
      ? "Madame l'Échevine, Monsieur l'Échevin de l'Enseignement,"
      : "Madame, Monsieur,",
    `Nous nous adressons à vous en votre qualité de pouvoir organisateur, dont relèvent ` +
      `${ecolesLabel} de notre relevé.`,
    circulaires.texte,
    "Chaque école dispose de son propre espace, cloisonné des autres : l'outil se déploie " +
      "école par école, sans projet informatique ni marché à passer. Il est gratuit et sans " +
      "limite de comptes, conçu par des enseignant·es.",
    "Si l'outil vous paraît utile, il suffit d'en informer vos directions — ou de nous dire " +
      "quand nous pouvons vous le présenter.",
  ];

  const liens = liensDecouverte(baseUrl, SRC_PO);

  const text = [
    ...paragraphes,
    "",
    `Pouvoir organisateur : ${po.nom}${po.localite ? ` — ${po.localite}` : ""}`,
    `Écoles concernées : ${ecolesLabel}`,
    `Créer l'espace d'une école : ${inscriptionUrl}`,
    ...liens.texte,
    "",
    `Une question ou une présentation ? ${contactEmail}`,
    "Vous recevez ce message parce que votre institution est le pouvoir organisateur",
    "d'écoles figurant à l'annuaire public de la Fédération Wallonie-Bruxelles. Pour ne",
    "plus en recevoir, répondez à cet email avec la mention DESINSCRIPTION.",
  ].join("\n");

  // Toutes les phrases via escapeHtml, sauf celle qui cite les circulaires
  // (paragraphes[2]) : c'est là qu'on veut des liens, cf. paragrapheCirculaires.
  const bodyHtml =
    [
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[0])}</p>`,
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[1])}</p>`,
      circulaires.html,
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[3])}</p>`,
      `<p style="margin:0 0 12px;">${escapeHtml(paragraphes[4])}</p>`,
    ].join("\n        ") +
    "\n        " +
    liens.html;

  const html = renderBrandedEmail({
    eyebrow: "Invitation aux pouvoirs organisateurs",
    title: `Le travail collaboratif de vos ${ecolesLabel}, suivi sans tableur.`,
    bodyHtml,
    rows: [
      { label: "Pouvoir organisateur", value: po.nom },
      ...(po.localite ? [{ label: "Localité", value: po.localite }] : []),
      { label: "Écoles concernées", value: ecolesLabel },
      { label: "Cadre", value: "Circulaires 7167 et 8894 — 60 périodes par enseignant·e et par an" },
      { label: "Coût", value: "Gratuite, sans limite de comptes" },
    ],
    cta: {
      label: "Découvrir la plateforme",
      url: inscriptionUrl,
      note: "Chaque école crée son espace en deux minutes ; les données restent cloisonnées par établissement.",
    },
    footerHtml: `Une question ou une présentation à vos directions ?
          <a href="mailto:${contactEmail}" style="color:${BRAND_600};">${escapeHtml(contactEmail)}</a>.
          Vous recevez ce message parce que votre institution est le pouvoir organisateur d'écoles
          figurant à l'annuaire public de la Fédération Wallonie-Bruxelles ; pour ne plus en
          recevoir, répondez simplement « DESINSCRIPTION ».`,
  });

  return {
    subject: SUJET_PO,
    text,
    html,
    listUnsubscribe: `<mailto:${contactEmail}?subject=DESINSCRIPTION>`,
  };
}
