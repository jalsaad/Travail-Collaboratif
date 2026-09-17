import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

// Lien « Ne plus recevoir ces emails » de la notification de nouvelle
// inscription (cf. lib/school-notifications.ts).
//
// Signé plutôt que stocké : le lien porte l'identifiant du rattachement et une
// signature HMAC calculée avec AUTH_SECRET. Aucune table de jetons, rien à
// expirer ni à nettoyer, et impossible de forger le lien d'un autre
// rattachement sans le secret du serveur.
//
// Pas d'expiration : le seul effet possible est de couper un email pour la
// personne qui l'a reçu, réactivable à tout moment dans /ecole/parametres. Un
// lien daté trahirait au contraire la promesse d'un désabonnement toujours
// possible depuis n'importe quel ancien email.

const PURPOSE = "notify-new-members";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET manquant : impossible de signer le lien de désabonnement.");
  return value;
}

function signature(membershipId: string): string {
  return createHmac("sha256", secret()).update(`${PURPOSE}:${membershipId}`).digest("base64url");
}

/// Deux adresses pour un même lien signé :
/// - `page` : le lien cliqué dans l'email. Il ouvre une page de confirmation
///   et ne modifie RIEN à l'ouverture — les antivirus de messagerie et les
///   aperçus de liens ouvrent les URL d'un email tout seuls, un GET qui
///   désabonne couperait l'email sans que personne ne l'ait demandé ;
/// - `oneClick` : l'en-tête List-Unsubscribe (RFC 8058), que Gmail ou Outlook
///   appellent en POST quand la personne clique sur « Se désabonner » dans
///   leur propre interface.
export function newMemberUnsubscribeLinks(
  baseUrl: string,
  membershipId: string
): { page: string; oneClick: string } {
  const params = new URLSearchParams({ m: membershipId, s: signature(membershipId) });
  return {
    page: `${baseUrl}/notifications/desabonnement?${params}`,
    oneClick: `${baseUrl}/api/notifications/desabonnement?${params}`,
  };
}

/// Renvoie l'identifiant du rattachement si la signature est valide, sinon null.
export function verifyNewMemberUnsubscribe(
  membershipId: string | null | undefined,
  sig: string | null | undefined
): string | null {
  if (!membershipId || !sig) return null;
  const attendu = Buffer.from(signature(membershipId));
  const recu = Buffer.from(sig);
  // timingSafeEqual exige deux tampons de même longueur.
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;
  return membershipId;
}

/// Désactive la notification pour ce rattachement. `updateMany` plutôt
/// qu'`update` : un rattachement supprimé depuis l'envoi de l'email ne doit
/// pas faire planter la page, il n'y a simplement plus rien à désactiver.
export async function disableNewMemberNotifications(membershipId: string): Promise<boolean> {
  const { count } = await prisma.membership.updateMany({
    where: { id: membershipId },
    data: { notifyNewMembers: false },
  });
  return count > 0;
}
