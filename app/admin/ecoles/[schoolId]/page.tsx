import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/role-labels";
import { AdminSchoolEditForm } from "@/components/admin-school-edit-form";
import { AdminMemberRowActions } from "@/components/admin-member-row-actions";
import { AdminPeriodList } from "@/components/admin-period-list";

const roleBadgeStyle: Record<string, string> = {
  DIRECTION: "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900",
  REFERENT_NUMERIQUE: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  ENSEIGNANT: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

export default async function AdminSchoolDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) notFound();

  const [members, periods, activeJoinCode] = await Promise.all([
    prisma.membership.findMany({
      where: { schoolId, status: "ACTIVE" },
      include: { user: true },
      orderBy: [{ role: "asc" }, { user: { lastName: "asc" } }],
    }),
    prisma.collaborativePeriod.findMany({
      where: { participants: { some: { membership: { schoolId } } } },
      include: { participants: { include: { user: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.joinCode.findFirst({ where: { schoolId, active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/ecoles" className="text-sm text-brand-700 hover:underline">
          ← Toutes les écoles
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">{school.name}</h1>
      </div>

      <AdminSchoolEditForm
        schoolId={school.id}
        name={school.name}
        reseau={school.reseau ?? ""}
        region={school.region ?? ""}
        niveaux={school.niveaux}
        typesEnseignement={school.typesEnseignement}
        address={school.address ?? ""}
        postalCode={school.postalCode ?? ""}
        locality={school.locality ?? ""}
        country={school.country ?? ""}
        phone={school.phone ?? ""}
        numeroFase={school.numeroFase ?? ""}
        logoUrl={school.logoUrl ?? ""}
      />

      <div className="card p-6">
        <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">Code de rattachement</h2>
        <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 font-mono text-lg tracking-wide text-stone-900 dark:bg-stone-800 dark:text-stone-100">
          {activeJoinCode?.code ?? "Aucun code actif"}
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Membres ({members.length})
        </h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Matricule</th>
                <th className="px-5 py-3">Rôle</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-stone-400 dark:text-stone-500">
                    Aucun membre pour le moment.
                  </td>
                </tr>
              )}
              {members.map((member) => (
                <tr key={member.id} className="border-b border-stone-50 transition last:border-0 hover:bg-stone-50/60 dark:border-stone-800 dark:hover:bg-stone-800/60">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/ecoles/${schoolId}/membres/${member.id}`}
                      className="font-medium text-stone-900 hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-500"
                    >
                      {member.user.firstName} {member.user.lastName}
                    </Link>
                    {member.isAccountOwner && (
                      <span className="ml-2 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                        titulaire
                      </span>
                    )}
                    <p className="text-xs text-stone-400 dark:text-stone-500">{member.user.email}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-stone-600 dark:text-stone-400">
                    {member.user.matricule ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeStyle[member.role]}`}>
                      {roleLabel[member.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <AdminMemberRowActions
                      membershipId={member.id}
                      role={member.role}
                      isAccountOwner={member.isAccountOwner}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Périodes ({periods.length})
        </h2>
        <div className="mt-3">
          <AdminPeriodList
            periods={periods.map((p) => ({ ...p, dureePeriodes: p.dureePeriodes.toString() }))}
            schoolId={schoolId}
          />
        </div>
      </div>
    </div>
  );
}
