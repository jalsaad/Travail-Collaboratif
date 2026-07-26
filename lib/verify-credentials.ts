import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Partagé entre auth.ts (Credentials provider) et app/(auth)/login/actions.ts
// (qui doit connaître le rôle AVANT d'appeler signIn — cf. commentaire dans
// loginAction sur la porte Direction/Profs) : une seule implémentation de la
// vérification mot de passe, jamais dupliquée.
export async function verifyCredentials(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}
