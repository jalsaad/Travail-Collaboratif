import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { getSchoolTeachersProgress } from "@/lib/collaboration-progress";
import { formatPeriodes } from "@/lib/period-duration";
import { CircularProgressRing } from "@/components/circular-progress-ring";
import { Reveal } from "@/components/reveal";

export default async function EcoleStatistiquesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  const teachers = schoolYear ? await getSchoolTeachersProgress(active.schoolId, schoolYear.id) : [];

  const average =
    teachers.length > 0 ? teachers.reduce((sum, t) => sum + t.percent, 0) / teachers.length : 0;
  const averageDone = teachers.length > 0 ? teachers.reduce((sum, t) => sum + t.done, 0) / teachers.length : 0;
  const averageObjective =
    teachers.length > 0 ? teachers.reduce((sum, t) => sum + t.objective, 0) / teachers.length : 0;

  const sortedTeachers = [...teachers].sort((a, b) => b.percent - a.percent);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Statistiques — {active.schoolName}
      </h1>

      {!schoolYear && (
        <div className="card p-6 text-sm text-stone-500 dark:text-stone-400">
          Aucune année scolaire configurée pour le moment.
        </div>
      )}

      {schoolYear && teachers.length === 0 && (
        <div className="card p-6 text-sm text-stone-500 dark:text-stone-400">
          Aucun enseignant actif pour le moment.
        </div>
      )}

      {schoolYear && teachers.length > 0 && (
        <>
          <Reveal className="card flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
              Moyenne d&apos;équipe — travail collaboratif effectué
            </p>
            <CircularProgressRing percent={average} size={160} strokeWidth={12} />
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {formatPeriodes(averageDone)} / {formatPeriodes(averageObjective)} périodes en moyenne, sur{" "}
              {teachers.length} enseignant{teachers.length > 1 ? "s" : ""}
            </p>
          </Reveal>

          <Reveal delay={80} className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
                  <th className="px-5 py-3">Enseignant·e</th>
                  <th className="px-5 py-3">Taux</th>
                  <th className="px-5 py-3">Effectuées</th>
                  <th className="px-5 py-3">Objectif</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeachers.map((teacher) => (
                  <tr
                    key={teacher.membershipId}
                    className="border-b border-stone-50 last:border-0 dark:border-stone-800"
                  >
                    <td className="px-5 py-3.5 font-medium text-stone-900 dark:text-stone-100">
                      {teacher.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <CircularProgressRing percent={teacher.percent} size={56} strokeWidth={5} />
                    </td>
                    <td className="px-5 py-3.5 text-stone-600 dark:text-stone-400">
                      {formatPeriodes(teacher.done)}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600 dark:text-stone-400">
                      {formatPeriodes(teacher.objective)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </>
      )}
    </div>
  );
}
