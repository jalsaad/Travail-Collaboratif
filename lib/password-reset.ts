import { randomBytes, createHash } from "crypto";

// Seul le hash vit en base (PasswordResetToken.tokenHash) — le token brut ne
// vit que dans l'URL emailée, jamais persisté. Si la base fuit, les liens
// déjà envoyés ne sont pas rejouables.
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  return { rawToken, tokenHash: hashResetToken(rawToken) };
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
