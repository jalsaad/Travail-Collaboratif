import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { getMembershipProgress, getOtherSchoolsPeriodes } from "@/lib/collaboration-progress";
import { formatPeriodes } from "@/lib/period-duration";
import { CircularProgressRing } from "@/components/circular-progress-ring";
import { PeriodCard } from "@/components/period-card";
import { NoActiveSchoolNotice } from "@/components/no-active-school-notice";
import { ExportPanel } from "@/components/export-panel";
import { Reveal } from "@/components/reveal";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export default async function MesPeriodesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return <NoActiveSchoolNotice />;

  const schoolYear = await getCurrentSchoolYear();
  const progress = schoolYear ? await getMembershipProgress(active.membershipId, schoolYear.id) : null;
  // Périodes déclarées dans les autres écoles de la personne, s'il y en a :
  // son obligation annuelle porte sur le total, pas sur une seule école.
  const ailleurs = schoolYear
    ? await getOtherSchoolsPeriodes(session.userId, active.membershipId, schoolYear.id)
    : 0;

  // Scopé sur l'année courante, comme l'espace Direction (cf. ecole/page.tsx) :
  // c'est ce qui fait repartir l'écran de zéro après l'archivage de fin
  // d'année (cf. lib/school-year-archive.ts), les périodes clôturées restant
  // en base et dans l'archive disque.
  const periods = schoolYear
    ? await prisma.collaborativePeriod.findMany({
        where: {
          schoolYearId: schoolYear.id,
          participants: { some: { membershipId: active.membershipId } },
        },
        include: {
          participants: {
            include: { user: true, membership: { include: { school: true } } },
          },
          externalParticipants: true,
        },
        orderBy: { date: "desc" },
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Mes périodes — {active.schoolName}
      </h1>

      {progress && (
        <Reveal className="card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-center sm:gap-6">
          <CircularProgressRing percent={progress.percent} size={120} strokeWidth={9} />
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {formatPeriodes(progress.done)} / {formatPeriodes(progress.objective)} périodes effectuées
            {schoolYear && (
              <span className="block text-xs text-stone-400 dark:text-stone-500">
                pour l&apos;année scolaire {schoolYear.label}
              </span>
            )}
            {ailleurs > 0 && (
              <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                dont {formatPeriodes(ailleurs)} période(s) dans un autre établissement —{" "}
                <span className="font-semibold text-stone-700 dark:text-stone-200">
                  {formatPeriodes(progress.done + ailleurs)} au total
                </span>
              </span>
            )}
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
