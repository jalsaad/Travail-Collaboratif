import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/role-labels";
import { SchoolApprovalActions } from "@/components/school-approval-actions";
import { Reveal } from "@/components/reveal";

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const statusLabel: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

export default async function AdminEcolesPage() {
  const schools = await prisma.school.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      memberships: {
        where: { isAccountOwner: true },
        include: { user: true },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Écoles</h1>
      <Reveal className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
              <th className="px-5 py-3">École</th>
              <th className="px-5 py-3">Titulaire</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3">Créée le</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {schools.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-400 dark:text-stone-500">
                  Aucune école enregistrée pour le moment.
                </td>
              </tr>
            )}
            {schools.map((school) => {
              const founder = school.memberships[0];
              return (
                <tr key={school.id} className="border-b border-stone-50 last:border-0 dark:border-stone-800">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/ecoles/${school.id}`}
                      className="font-medium text-stone-900 hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-500"
                    >
                      {school.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                    {founder ? (
                      <>
                        {founder.user.firstName} {founder.user.lastName}
                        <span className="text-stone-400 dark:text-stone-500"> — {roleLabel[founder.role]}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[school.status]}`}
                    >
                      {statusLabel[school.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                    {school.createdAt.toLocaleDateString("fr-BE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    {(school.status === "PENDING" || school.status === "REJECTED") && (
                      <SchoolApprovalActions schoolId={school.id} status={school.status} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Reveal>
    </div>
  );
}
