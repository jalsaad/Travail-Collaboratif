import { randomBytes, createHash } from "crypto";

// Jeton du bouton « Valider ma participation » des emails d'invitation.
// Même invariant que lib/password-reset.ts : seul le hash vit en base, le
// jeton brut n'existe que dans l'URL envoyée. Si la base fuit, les liens déjà
// expédiés ne sont pas rejouables.

export function generateParticipationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  return { rawToken, tokenHash: hashParticipationToken(rawToken) };
}

export function hashParticipationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/// 30 jours : bien plus long que le lien de mot de passe (1h), car rien
/// n'est urgent ici et un enseignant peut ne relever sa boîte qu'après un
/// congé. Passé ce délai, la validation reste possible depuis la plateforme.
export const PARTICIPATION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
