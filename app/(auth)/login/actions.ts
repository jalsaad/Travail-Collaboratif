"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyCredentials } from "@/lib/verify-credentials";

export type LoginState = { error?: string; switchTo?: "profs" | "direction" };

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const espace = formData.get("espace");

  // Vérifie le mot de passe nous-mêmes AVANT d'appeler signIn : on a ainsi
  // besoin du rôle avant d'établir la session, pour appliquer la restriction
  // d'espace ci-dessous. Chaîner signIn() puis signOut() dans la même action
  // ne fonctionne pas de façon fiable (signOut relit les cookies de la
  // requête entrante d'origine, pas la mutation que signIn vient de faire) —
  // mieux vaut ne jamais établir la session plutôt que la défaire après coup.
  const user = await verifyCredentials(email, password);
  if (!user) {
    return { error: "Email ou mot de passe incorrect." };
  }

  // La porte choisie (Direction/Profs) reste une aide à la navigation pour la
  // destination post-connexion, mais un compte enseignant seul (aucune
  // Membership DIRECTION/REFERENT_NUMERIQUE, ni administrateur plateforme)
  // n'a pas accès à l'espace Direction.
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { role: true },
  });
  const hasManagementRole = memberships.some(
    (m) => m.role === "DIRECTION" || m.role === "REFERENT_NUMERIQUE"
  );
  const canUseDirectionEspace = hasManagementRole || user.isSuperAdmin;

  if (espace === "direction" && !canUseDirectionEspace) {
    return {
      error: "Ce compte enseignant·e ne donne pas accès à l'espace Direction.",
      switchTo: "profs",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: hasManagementRole ? "/ecole" : "/mes-periodes",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw error; // laisse passer la redirection interne de signIn en cas de succès
  }
}
