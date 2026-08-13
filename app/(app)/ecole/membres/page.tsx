import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { roleLabel } from "@/lib/role-labels";
import { MemberRowActions } from "@/components/member-row-actions";
import { Reveal } from "@/components/reveal";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

const roleBadgeStyle: Record<string, string> = {
  DIRECTION: "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900",
  REFERENT_NUMERIQUE: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  ENSEIGNANT: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

export default async function MembresPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const schoolYear = await getCurrentSchoolYear();

  const members = await prisma.membership.findMany({
    where: { schoolId: active.schoolId, status: "ACTIVE" },
    include: {
      user: true,
      annualAssignments: schoolYear ? { where: { schoolYearId: schoolYear.id } } : false,
    },
    orderBy: [{ role: "asc" }, { user: { lastName: "asc" } }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Membres — {active.schoolName}
      </h1>

      <Reveal className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">ETP</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const assignment = member.annualAssignments?.[0];
              const canManage = member.role !== "DIRECTION" && !member.isAccountOwner;
              return (
                <tr
                  key={member.id}
                  className="border-b border-stone-50 transition last:border-0 hover:bg-stone-50/60 dark:border-stone-800 dark:hover:bg-stone-800/60"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/ecole/membres/${member.id}`}
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
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeStyle[member.role]}`}
                    >
                      {roleLabel[member.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-stone-600 dark:text-stone-400">
                    {assignment ? Number(assignment.etp).toString() : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {canManage && <MemberRowActions membershipId={member.id} role={member.role} />}
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
