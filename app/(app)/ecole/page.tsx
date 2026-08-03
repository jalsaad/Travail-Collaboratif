import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { computePeriodStatus } from "@/lib/period-status";
import { roleLabel } from "@/lib/role-labels";
import { formatSchoolAddress } from "@/lib/school-address";
import { SchoolPeriodList } from "@/components/school-period-list";
import { ExportPanel } from "@/components/export-panel";
import { TeacherReminderPanel } from "@/components/teacher-reminder-panel";
import { CopyCodeBadge } from "@/components/copy-code-badge";
import { Reveal } from "@/components/reveal";

export default async function EcolePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes"); // le layout garantit déjà les droits, garde défensive

  const [school, roleCounts, members, schoolYear, reminder, joinCode] = await Promise.all([
    prisma.school.findUniqueOrThrow({ where: { id: active.schoolId } }),
    prisma.membership.groupBy({
      by: ["role"],
      where: { schoolId: active.schoolId, status: "ACTIVE" },
      _count: true,
    }),
    prisma.membership.findMany({
      where: { schoolId: active.schoolId, status: "ACTIVE" },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
    prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } }),
    prisma.announcement.findFirst({
      where: {
        status: "PUBLISHED",
        expiresAt: { gt: new Date() },
        targets: { some: { schoolId: active.schoolId, role: "ENSEIGNANT" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.joinCode.findFirst({ where: { schoolId: active.schoolId, active: true } }),
  ]);

  const activeReminder = reminder
    ? {
        id: reminder.id,
        body: reminder.body,
        daysRemaining: Math.ceil(
          (reminder.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        ),
      }
    : null;

  const periods = schoolYear
    ? await prisma.collaborativePeriod.findMany({
        where: {
          schoolYearId: schoolYear.id,
          participants: { some: { membership: { schoolId: active.schoolId, status: "ACTIVE" } } },
        },
        include: {
          // Filtre obligatoire (cf. permissions.md) : jamais un include global
          // des participants, sinon fuite des noms/statuts d'une autre école
          // sur une période inter-écoles.
          participants: {
            where: { membership: { schoolId: active.schoolId } },
            include: { user: true },
          },
        },
        orderBy: { date: "desc" },
      })
    : [];

  const validee = periods.filter((p) => computePeriodStatus(p.participants) === "validee").length;

  return (
    <div className="space-y-6">
      <Reveal className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">{school.name}</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {school.reseau ?? "Réseau non renseigné"} ·{" "}
              {formatSchoolAddress(school) ?? "Adresse non renseignée"}
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Numéro FASE : {school.numeroFase ?? "—"}</p>
          </div>
          <CopyCodeBadge code={joinCode?.code ?? null} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-stone-100 pt-5 dark:border-stone-800">
          {roleCounts.map((r) => (
            <div key={r.role} className="rounded-lg bg-stone-50/70 px-3 py-2.5 text-sm dark:bg-stone-800/70">
              <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{r._count}</p>
              <p className="text-stone-500 dark:text-stone-400">{roleLabel[r.role]}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={80}>
        <TeacherReminderPanel activeReminder={activeReminder} />
      </Reveal>

      <Reveal delay={160} className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Travail collaboratif — {validee} validée(s) / {periods.length - validee} en attente
        </h2>
        <ExportPanel
          action="/api/export/school"
          members={members.map((m) => ({
            userId: m.userId,
            name: `${m.user.firstName} ${m.user.lastName}`,
          }))}
        />
        <div>
          <SchoolPeriodList periods={periods} />
        </div>
      </Reveal>
    </div>
  );
}
