import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolveActiveMembership } from "@/lib/active-school";
import { assertCanManageSchool, ForbiddenError } from "@/lib/school-authorization";

export default async function EcoleLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  try {
    // Re-vérification fraîche en DB, jamais session.memberships (snapshot JWT
    // possiblement périmé si le rôle a changé depuis la connexion).
    await assertCanManageSchool(session.userId, active.schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/mes-periodes");
    throw error;
  }

  // Plus de barre d'onglets ici : Tableau de bord, Paramètres et Journal sont
  // dans le tiroir (cf. components/nav.tsx, section « Mon école »), qui porte
  // toute la navigation. Les garder aux deux endroits les aurait dupliqués.
  return <>{children}</>;
}
