import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { AdminNav, type AdminNavTab } from "@/components/admin-nav";
import { SchoolLogoBadge } from "@/components/school-logo-badge";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

const tabs: AdminNavTab[] = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/ecoles", label: "Écoles" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/cartographie", label: "Cartographie" },
  { href: "/admin/annonces", label: "Annonces" },
  { href: "/admin/assistance", label: "Assistance" },
  { href: "/admin/dons", label: "Dons" },
  { href: "/admin/archives", label: "Archives" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    // Re-vérification fraîche en DB, jamais session.isSuperAdmin (snapshot JWT).
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/mes-periodes");
    throw error;
  }

  const [openTicketsCount, schoolYear] = await Promise.all([
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    getCurrentSchoolYear(),
  ]);

  // Même ossature que les espaces Profs et Direction (cf. app/(app)/layout.tsx) :
  // menu hamburger épinglé, logo centré, contenu en dessous. La barre
  // d'onglets fixe qui tenait lieu de navigation ici a été rangée dans le
  // tiroir, pour que les trois espaces se pilotent de la même façon.
  return (
    <div className="min-h-screen bg-stone-50 pt-4 dark:bg-stone-950">
      <AdminNav
        session={session}
        tabs={tabs}
        openTicketsCount={openTicketsCount}
        schoolYearLabel={schoolYear?.label ?? null}
      />
      <SchoolLogoBadge />
      <p className="mt-1 text-center text-sm font-semibold text-stone-500 dark:text-stone-400">
        Administration plateforme
      </p>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
