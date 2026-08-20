// Adresse du site d'une école, saisie à la main dans trois formulaires. Une
// direction écrit « www.ecole.be » ou « ecole.be » aussi souvent que l'adresse
// complète : sans préfixe, un lien `href` serait interprété comme un chemin
// relatif et mènerait à une page de la plateforme.

export class InvalidWebsiteError extends Error {}

/// Ramène une saisie libre à une URL utilisable, ou à null si le champ est
/// vide. Le schéma manquant est complété en https ; http explicite est
/// conservé, quelques écoles n'ayant pas de certificat.
export function normalizeWebsite(valeur: string | null | undefined): string | null {
  const brut = (valeur ?? "").trim();
  if (brut === "") return null;

  const avecSchema = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
  let url: URL;
  try {
    url = new URL(avecSchema);
  } catch {
    throw new InvalidWebsiteError("Adresse du site invalide (ex : www.mon-ecole.be).");
  }

  // Un hôte sans point — « ecole », « localhost » — n'est pas une adresse
  // publique : mieux vaut le refuser que d'enregistrer un lien mort.
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) {
    throw new InvalidWebsiteError("Adresse du site invalide (ex : www.mon-ecole.be).");
  }
  return url.toString().replace(/\/$/, "");
}

/// Version courte pour l'affichage : le schéma et le « www. » n'apprennent
/// rien à personne.
export function websiteLabel(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}
