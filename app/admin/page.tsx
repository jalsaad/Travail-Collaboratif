import { prisma } from "@/lib/prisma";
import { computePeriodStatus } from "@/lib/period-status";
import { roleLabel } from "@/lib/role-labels";
import { Reveal } from "@/components/reveal";

export default async function AdminDashboardPage() {
  const [schoolCount, roleCounts, periods, recentLogins] = await Promise.all([
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
  ]);

  const validee = periods.filter((p) => computePeriodStatus(p.participants) === "validee").length;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Tableau de bord — utilisation de la plateforme
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Reveal delay={0} className="card p-4">
          <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{schoolCount}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Écoles</p>
        </Reveal>
        {roleCounts.map((r, i) => (
          <Reveal key={r.role} delay={(i + 1) * 60} className="card p-4">
            <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{r._count}</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">{roleLabel[r.role]}</p>
          </Reveal>
        ))}
        <Reveal delay={(roleCounts.length + 1) * 60} className="card p-4">
          <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{periods.length}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Périodes déclarées</p>
        </Reveal>
        <Reveal delay={(roleCounts.length + 2) * 60} className="card p-4">
          <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {validee} / {periods.length - validee}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Validées / en attente</p>
        </Reveal>
      </div>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">Dernières connexions</h2>
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
