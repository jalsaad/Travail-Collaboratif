import { randomBytes, createHash } from "crypto";

// Jeton du lien/QR de parrainage (cf. PeerReferral dans schema.prisma). Même
// invariant que lib/participation-token.ts / lib/password-reset.ts : seul le
// hash vit en base, le jeton brut n'existe que dans le lien transmis en main
// propre — impossible à réafficher après coup si l'enseignant qui l'a généré
// ne l'a pas copié tout de suite.

export function generatePeerReferralToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  return { rawToken, tokenHash: hashPeerReferralToken(rawToken) };
}

export function hashPeerReferralToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/// 30 jours, comme le lien de validation de participation : rien d'urgent ici,
/// et l'enseignant peut toujours en régénérer un si celui-ci expire avant
/// d'avoir été utilisé.
export const PEER_REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
