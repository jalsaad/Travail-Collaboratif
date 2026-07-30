import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { getMembershipProgress } from "@/lib/collaboration-progress";
import { CircularProgressRing } from "@/components/circular-progress-ring";
import { PeriodCard } from "@/components/period-card";
import { NoActiveSchoolNotice } from "@/components/no-active-school-notice";
import { ExportPanel } from "@/components/export-panel";
import { Reveal } from "@/components/reveal";

export default async function MesPeriodesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return <NoActiveSchoolNotice />;

  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  const progress = schoolYear ? await getMembershipProgress(active.membershipId, schoolYear.id) : null;

  const periods = await prisma.collaborativePeriod.findMany({
    where: {
      participants: { some: { membershipId: active.membershipId } },
    },
    include: {
      participants: {
        include: { user: true, membership: { include: { school: true } } },
      },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Mes périodes — {active.schoolName}
      </h1>

      {progress && (
        <Reveal className="card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-center sm:gap-6">
          <CircularProgressRing percent={progress.percent} size={120} strokeWidth={9} />
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {progress.done.toFixed(1)} / {progress.objective.toFixed(0)} périodes effectuées
          </p>
        </Reveal>
      )}

      <ExportPanel action="/api/export/mine" />

      {periods.length === 0 && (
        <div className="card p-6 text-sm text-stone-500 dark:text-stone-400">
          Aucune période déclarée pour cette école pour le moment.
        </div>
      )}

      <div className="space-y-3">
        {periods.map((period, index) => (
          <PeriodCard key={period.id} period={period} currentUserId={session.userId} index={index} />
        ))}
      </div>
    </div>
  );
}
