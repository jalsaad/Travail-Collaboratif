// Politique de confidentialité (RGPD, art. 5.1.a et 13) : version en vigueur,
// prise de connaissance à l'inscription, et faits que seul le responsable du
// traitement peut attester.
//
// PRISE DE CONNAISSANCE, PAS CONSENTEMENT. La case à cocher avant toute
// inscription atteste que la personne a été informée (art. 13) ; elle ne
// fonde PAS le traitement. Un consentement exigé comme condition d'accès au
// service ne serait pas « libre » (art. 7.4 et considérant 43) et serait donc
// nul. Le traitement repose sur l'exécution du service demandé (art. 6.1.b),
// ce qui rend la case obligatoire sans vicier quoi que ce soit.

/// À incrémenter à chaque modification substantielle du texte : la version
/// acceptée est enregistrée avec chaque compte, ce qui permet de savoir qui a
/// été informé de quoi (principe de responsabilité, art. 5.2).
export const PRIVACY_POLICY_VERSION = "2026-09-16";

/// Nom du champ de formulaire — partagé entre la case (côté client) et sa
/// vérification (côté serveur), qui ne doivent pas diverger.
export const PRIVACY_FIELD = "privacyAccepted";

export const PRIVACY_REFUSED_MESSAGE =
  "Prenez connaissance de la politique de confidentialité et cochez la case pour poursuivre.";

/// Vérification serveur : la case est `required` côté navigateur, mais une
/// requête forgée à la main passerait outre. C'est ce contrôle-ci qui fait foi.
export function hasAcceptedPrivacyPolicy(formData: FormData): boolean {
  return formData.get(PRIVACY_FIELD) === "on";
}

/// Trace à enregistrer sur le compte au moment de sa création.
export function privacyAcceptanceRecord() {
  return { privacyAcceptedAt: new Date(), privacyPolicyVersion: PRIVACY_POLICY_VERSION };
}

// ---------------------------------------------------------------------------
// Faits à attester par le responsable du traitement.
//
// Tout ce qui vaut `null` ci-dessous est INCONNU du code : identité du
// responsable, prestataires réellement utilisés en production, durées de
// conservation. Ces informations sont obligatoires (art. 13) et ne peuvent pas
// être devinées. Tant qu'il en reste une à `null`, la page publique affiche un
// bandeau « brouillon » bien visible : mieux vaut une page manifestement
// incomplète qu'une page d'apparence finie qui affirmerait des faits faux.
// ---------------------------------------------------------------------------

export const RESPONSABLE: {
  /// Personne physique, ASBL ou société qui exploite la plateforme.
  nom: string | null;
  adresse: string | null;
  /// Adresse à laquelle exercer ses droits.
  email: string | null;
  /// Délégué à la protection des données, s'il en a été désigné un. `false`
  /// signifie « aucun DPO désigné », `null` « pas encore renseigné ». Le
  /// responsable du traitement ne peut pas être son propre DPO (conflit
  /// d'intérêts, art. 38.6) ; la désignation n'est pas obligatoire ici
  /// (art. 37.1 : ni autorité publique, ni suivi à grande échelle, ni données
  /// sensibles).
  dpo: string | false | null;
} = {
  nom: "Jalal El-Fedyly",
  adresse: "Chaussée de Renaix 115, 7912 Frasnes-lez-Anvaing (Belgique)",
  email: "admin@travail-collaboratif.be",
  dpo: false,
};

/// Conception et développement de la plateforme. Mention d'information, pas
/// une rubrique de l'art. 13 : le développeur n'est pas le responsable du
/// traitement. S'il accède aux données de production (maintenance, support),
/// il agit comme sous-traitant (art. 28).
export const DEVELOPPEMENT = "JAS Digital Works";

export const PRESTATAIRES: {
  /// Hébergement du serveur et de la base de données.
  hebergement: string | null;
  /// Service d'envoi des emails (serveur SMTP configuré en production).
  email: string | null;
  /// Stockage des fichiers (logos, pièces jointes d'assistance) : service de
  /// stockage objet, ou disque du serveur lui-même.
  stockage: string | null;
  /// Transfert de données hors de l'Union européenne.
  transfertHorsUE: string | null;
} = {
  hebergement: "OVHcloud, centre de données de Roubaix (France)",
  email: "OVHcloud",
  stockage: "OVHcloud",
  transfertHorsUE:
    "aucun. Les données sont hébergées dans les centres de données d'OVHcloud à Roubaix (France).",
};

export const CONSERVATION: {
  /// Données du compte tant qu'il est actif, et après inactivité.
  compte: string | null;
  /// Relevés archivés en fin d'année scolaire (cf. lib/school-year-archive.ts).
  archives: string | null;
} = {
  // Aucune purge automatique des comptes inactifs n'existe dans le code : ne
  // pas en annoncer une tant qu'elle n'est pas implémentée.
  compte: "tant que le compte existe, jusqu'à sa suppression.",
  // Conforme à ARCHIVE_RETENTION (lib/school-year-archive.ts) : à ajuster si
  // cette constante change.
  archives:
    "les trois dernières années scolaires clôturées ; les archives plus anciennes sont supprimées automatiquement.",
};

/// Vrai tant qu'au moins un fait obligatoire manque.
export function politiqueIncomplete(): boolean {
  return [
    RESPONSABLE.nom,
    RESPONSABLE.adresse,
    RESPONSABLE.email,
    RESPONSABLE.dpo,
    PRESTATAIRES.hebergement,
    PRESTATAIRES.email,
    PRESTATAIRES.stockage,
    PRESTATAIRES.transfertHorsUE,
    CONSERVATION.compte,
    CONSERVATION.archives,
  ].some((valeur) => valeur === null);
}
