import { prisma } from "@/lib/prisma";
import { computePeriodStatus } from "@/lib/period-status";
import { roleLabel } from "@/lib/role-labels";
import { Reveal } from "@/components/reveal";
import { SatisfactionChart } from "@/components/satisfaction-chart";
import { AdminStatTile } from "@/components/admin-stat-tile";
import { AnimatedNumber } from "@/components/animated-number";
import { AcademicCapIcon, UsersIcon, CalendarIcon, CheckBadgeIcon } from "@/components/admin-icons";

export default async function AdminDashboardPage() {
  const [schoolCount, roleCounts, periods, recentLogins, satisfactionRatings] = await Promise.all([
    prisma.school.count(),
    prisma.membership.groupBy({
      by: ["role"],
      where: { status: "ACTIVE" },
      _count: true,
    }),
    prisma.collaborativePeriod.findMany({
      include: { participants: { select: { status: true } } },
    }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 10,
    }),
    prisma.user.findMany({
      where: { satisfactionRating: { not: null } },
      select: { satisfactionRating: true },
    }),
  ]);

  const validee = periods.filter((p) => computePeriodStatus(p.participants) === "validee").length;

  const satisfactionTotal = satisfactionRatings.length;
  const satisfactionAverage =
    satisfactionTotal > 0
      ? satisfactionRatings.reduce((sum, u) => sum + (u.satisfactionRating ?? 0), 0) / satisfactionTotal
      : null;
  const satisfactionDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: satisfactionRatings.filter((u) => u.satisfactionRating === rating).length,
  }));

  const validationPct = periods.length > 0 ? (validee / periods.length) * 100 : 0;

  return (
    <div className="relative space-y-6">
      {/* Décor discret en fond de page, cf. .hero-grid / .animate-drift-* déjà
          utilisés sur la page de login — opacité très réduite pour rester
          lisible derrière un écran dense en données. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="hero-grid absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" />
        <div className="animate-drift-a absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/10" />
        <div className="animate-drift-b absolute -right-24 top-32 h-72 w-72 rounded-full bg-brand-teal/10 blur-3xl dark:bg-brand-teal/10" />
      </div>

      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Tableau de bord — utilisation de la plateforme
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Reveal delay={0}>
          <AdminStatTile icon={<AcademicCapIcon />} value={schoolCount} label="Écoles" />
        </Reveal>
        {roleCounts.map((r, i) => (
          <Reveal key={r.role} delay={(i + 1) * 60}>
            <AdminStatTile icon={<UsersIcon />} value={r._count} label={roleLabel[r.role]} />
          </Reveal>
        ))}
        <Reveal delay={(roleCounts.length + 1) * 60}>
          <AdminStatTile icon={<CalendarIcon />} value={periods.length} label="Périodes déclarées" />
        </Reveal>
        <Reveal delay={(roleCounts.length + 2) * 60} className="col-span-2 card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-teal text-white">
              <CheckBadgeIcon />
            </span>
            <div className="flex-1">
              <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                <AnimatedNumber value={validee} /> / <AnimatedNumber value={periods.length - validee} />
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">Validées / en attente</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-teal transition-[width] duration-700"
              style={{ width: `${validationPct}%` }}
            />
          </div>
        </Reveal>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-600 to-brand-teal text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </span>
          Satisfaction
        </h2>
        <Reveal delay={(roleCounts.length + 3) * 60} className="mt-3">
          <SatisfactionChart
            distribution={satisfactionDistribution}
            total={satisfactionTotal}
            average={satisfactionAverage}
          />
        </Reveal>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-600 to-brand-teal text-white">
            <CalendarIcon />
          </span>
          Dernières connexions
        </h2>
        <Reveal className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
                <th className="px-5 py-3">Utilisateur</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {recentLogins.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-stone-400 dark:text-stone-500">
                    Aucune connexion enregistrée pour le moment.
                  </td>
                </tr>
              )}
              {recentLogins.map((u) => (
                <tr key={u.id} className="border-b border-stone-50 last:border-0 dark:border-stone-800">
                  <td className="px-5 py-3.5 text-stone-900 dark:text-stone-100">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-stone-400 dark:text-stone-500">{u.email}</td>
                  <td className="px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                    {u.lastLoginAt?.toLocaleDateString("fr-BE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    {u.lastLoginAt?.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </div>
  );
}
