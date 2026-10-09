/// Adresse publique canonique de la plateforme.
///
/// Volontairement une CONSTANTE, et non l'hôte de la requête courante comme
/// le fait lib/mailer.ts::getBaseUrl : un lien de partage doit toujours
/// désigner le site public. Partagé depuis un codespace, une préproduction
/// ou localhost, il enverrait sinon le réseau entier d'une enseignante sur
/// une adresse que personne ne peut ouvrir.
///
/// Préfixe NEXT_PUBLIC_ : la valeur est inlinée au build, donc lisible aussi
/// par les composants client (cf. components/share-buttons.tsx, monté dans
/// la fenêtre de partage des étoiles de satisfaction).
export const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://travail-collaboratif.be"
).replace(/\/+$/, "");
