import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { MemberInfoPanel } from "@/components/member-info-panel";
import { SchoolPeriodList } from "@/components/school-period-list";
import { ExportPanel } from "@/components/export-panel";
import { getMembershipProgress, getOtherSchoolsPeriodes } from "@/lib/collaboration-progress";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { MemberRowActions } from "@/components/member-row-actions";
import { Reveal } from "@/components/reveal";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const member = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId: active.schoolId, status: "ACTIVE" },
    include: { user: true, levelHours: { include: { discipline: { select: { name: true } } } } },
  });
  if (!member) notFound();

  // Compteurs de l'année en cours. L'agrégat inter-écoles suit la même règle
  // que les relevés (cf. lib/collaboration-progress.ts) : un total, sans nom
  // d'établissement ni détail des périodes.
  const schoolYear = await getCurrentSchoolYear();
  const progress = schoolYear ? await getMembershipProgress(member.id, schoolYear.id) : null;
  const ailleurs = schoolYear
    ? await getOtherSchoolsPeriodes(member.userId, member.id, schoolYear.id)
    : 0;

  // Périodes de CETTE personne dans CETTE école. Le filtre sur les
  // participants est obligatoire (cf. permissions.md) : sans lui, une période
  // inter-écoles exposerait les collègues d'un autre établissement.
  const periods = schoolYear
    ? await prisma.collaborativePeriod.findMany({
        where: {
          schoolYearId: schoolYear.id,
          participants: { some: { membershipId: member.id } },
        },
        include: {
          participants: {
            where: { membership: { schoolId: active.schoolId } },
            include: { user: true },
          },
        },
        orderBy: { date: "desc" },
      })
    : [];

  const canManageRoleOrRemove = member.role !== "DIRECTION" && !member.isAccountOwner;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {member.user.firstName} {member.user.lastName}
      </h1>

      <Reveal>
        <MemberInfoPanel
          fullName={`${member.user.firstName} ${member.user.lastName}`}
          levelHours={member.levelHours.map((lh) => ({
            level: lh.level,
            hours: lh.hours.toString(),
            discipline: lh.discipline.name,
          }))}
          done={progress?.done ?? 0}
          objective={progress?.objective ?? 0}
          otherSchools={ailleurs > 0 ? ailleurs : null}
          lastLoginAt={member.user.lastLoginAt}
        />
      </Reveal>


      <Reveal delay={120}>
        <div className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Périodes déclarées ({periods.length})
          </h2>
          {/* Même relevé que celui de l'enseignant·e, servi par la route de
              l'école avec la personne figée : le PDF porte alors son bloc
              d'identité (cf. lib/export-identity.ts). */}
          <ExportPanel action="/api/export/school" fixedUserId={member.userId} />
          <SchoolPeriodList periods={periods} />
        </div>
      </Reveal>

      {canManageRoleOrRemove && (
        <Reveal delay={80} className="card p-6">
          <h2 className="mb-3 text-sm font-medium text-stone-700 dark:text-stone-300">Rôle et rattachement</h2>
          <MemberRowActions membershipId={member.id} role={member.role} />
        </Reveal>
      )}
    </div>
  );
}
