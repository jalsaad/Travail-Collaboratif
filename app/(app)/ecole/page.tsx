import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { computePeriodStatus } from "@/lib/period-status";
import { roleLabel } from "@/lib/role-labels";
import { formatSchoolAddress } from "@/lib/school-address";
import { websiteLabel } from "@/lib/website-url";
import { getSchoolTeachersProgress } from "@/lib/collaboration-progress";
import { formatPeriodes } from "@/lib/period-duration";
import { SchoolPeriodList } from "@/components/school-period-list";
import { SchoolTeamTable, type TeamMember } from "@/components/school-team-table";
import { CircularProgressRing } from "@/components/circular-progress-ring";
import { ExportPanel } from "@/components/export-panel";
import { TeacherReminderPanel } from "@/components/teacher-reminder-panel";
import { CopyCodeBadge } from "@/components/copy-code-badge";
import { JoinPosterLink } from "@/components/join-poster-link";
import { Reveal } from "@/components/reveal";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import type { Role } from "@prisma/client";

// Page unique de l'espace direction : identité de l'école, équipe et périodes.
// Les anciens onglets « Membres » et « Statistiques » y sont fondus — ils
// listaient les deux fois les mêmes personnes, l'un avec le rôle et l'ETP,
// l'autre avec l'avancement, et répétaient chacun le nom de l'école et
// l'année scolaire déjà affichés ici.
export default async function EcolePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes"); // le layout garantit déjà les droits, garde défensive

  const [school, members, schoolYear, reminder, joinCode] = await Promise.all([
    prisma.school.findUniqueOrThrow({ where: { id: active.schoolId } }),
    prisma.membership.findMany({
      where: { schoolId: active.schoolId, status: "ACTIVE" },
      include: { user: true },
      orderBy: [{ role: "asc" }, { user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
    getCurrentSchoolYear(),
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

  // Les affectations annuelles portent l'ETP ; l'avancement, lui, ne concerne
  // que les enseignant·es. Deux requêtes séparées plutôt qu'un include sur la
  // liste des membres : getSchoolTeachersProgress agrège déjà les périodes
  // faites ailleurs, qu'un include ne saurait pas calculer.
  const [assignments, teachersProgress] = await Promise.all([
    schoolYear
      ? prisma.annualAssignment.findMany({
          where: { schoolYearId: schoolYear.id, membership: { schoolId: active.schoolId } },
          select: { membershipId: true, etp: true },
        })
      : Promise.resolve([]),
    schoolYear ? getSchoolTeachersProgress(active.schoolId, schoolYear.id) : Promise.resolve([]),
  ]);

  const etpParMembership = new Map(assignments.map((a) => [a.membershipId, Number(a.etp).toString()]));
  const progressParMembership = new Map(teachersProgress.map((t) => [t.membershipId, t]));

  const equipe: TeamMember[] = members.map((member) => {
    const progress = progressParMembership.get(member.id);
    return {
      membershipId: member.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      role: member.role,
      isAccountOwner: member.isAccountOwner,
      etp: etpParMembership.get(member.id) ?? null,
      progress: progress
        ? {
            percent: progress.percent,
            done: progress.done,
            objective: progress.objective,
            otherSchools: progress.otherSchools,
          }
        : null,
    };
  });

  // Compté depuis la liste déjà chargée : un groupBy supplémentaire donnerait
  // les mêmes nombres à partir des mêmes lignes.
  const roleCounts = equipe.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  const average =
    teachersProgress.length > 0
      ? teachersProgress.reduce((sum, t) => sum + t.percent, 0) / teachersProgress.length
      : 0;
  const averageDone =
    teachersProgress.length > 0
      ? teachersProgress.reduce((sum, t) => sum + t.done, 0) / teachersProgress.length
      : 0;
  const averageObjective =
    teachersProgress.length > 0
      ? teachersProgress.reduce((sum, t) => sum + t.objective, 0) / teachersProgress.length
      : 0;

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
          externalParticipants: true,
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
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Numéro FASE : {school.numeroFase ?? "—"}
              {school.website && (
                <>
                  {" · "}
                  {/* noreferrer : l'adresse est saisie par la direction, rien
                      n'oblige le site visé à être digne de confiance. */}
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline transition hover:text-brand-700 dark:hover:text-brand-400"
                  >
                    {websiteLabel(school.website)}
                  </a>
                </>
              )}
            </p>
            {/* Les compteurs ci-dessous ne portent que sur l'année courante. */}
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Année scolaire :{" "}
              <span className="font-semibold text-stone-600 dark:text-stone-300">
                {schoolYear?.label ?? "aucune ouverte"}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <CopyCodeBadge code={joinCode?.code ?? null} />
            {/* Masqué sans code actif : l'affiche n'aurait rien à montrer, et
                la route refuserait de la produire. */}
            {joinCode && <JoinPosterLink />}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 border-t border-stone-100 pt-5 sm:flex-row sm:items-center dark:border-stone-800">
          <div className="grid flex-1 grid-cols-3 gap-3">
            {(Object.keys(roleCounts) as Role[]).map((role) => (
              <div key={role} className="rounded-lg bg-stone-50/70 px-3 py-2.5 text-sm dark:bg-stone-800/70">
                <p className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  {roleCounts[role]}
                </p>
                <p className="text-stone-500 dark:text-stone-400">{roleLabel[role]}</p>
              </div>
            ))}
          </div>

          {teachersProgress.length > 0 && (
            <div className="flex items-center gap-4 sm:border-l sm:border-stone-100 sm:pl-5 sm:dark:border-stone-800">
              <CircularProgressRing percent={average} size={92} strokeWidth={8} />
              <div className="text-sm">
                <p className="font-medium text-stone-600 dark:text-stone-300">Moyenne d&apos;équipe</p>
                <p className="text-stone-500 dark:text-stone-400">
                  {formatPeriodes(averageDone)} / {formatPeriodes(averageObjective)} périodes
                </p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={80}>
        <TeacherReminderPanel activeReminder={activeReminderDe(reminder)} />
      </Reveal>

      <Reveal delay={160} className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Équipe — {equipe.length} membre{equipe.length > 1 ? "s" : ""}
        </h2>
        <SchoolTeamTable members={equipe} />
      </Reveal>

      <Reveal delay={240} className="space-y-3">
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

/// Le panneau de rappel attend le décompte de jours, pas la date d'expiration.
function activeReminderDe(
  reminder: { id: string; body: string; expiresAt: Date | null } | null
) {
  if (!reminder) return null;
  return {
    id: reminder.id,
    body: reminder.body,
    daysRemaining: Math.ceil((reminder.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  };
}
