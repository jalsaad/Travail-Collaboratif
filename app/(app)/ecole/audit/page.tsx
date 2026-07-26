import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { Reveal } from "@/components/reveal";

const actionLabel: Record<string, string> = {
  REMOVE_MEMBER: "Retrait d'un membre",
  UPDATE_MEMBER_ROLE: "Changement de rôle",
  UPDATE_MEMBER_PROFILE: "Modification de profil",
  UPDATE_SCHOOL_INFO: "Modification des infos de l'école",
  REGENERATE_JOIN_CODE: "Régénération du code de rattachement",
  JOIN_VIA_CODE: "Rattachement via code",
  CREATE_SCHOOL: "Création de l'école",
};

export default async function AuditPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const entries = await prisma.auditLog.findMany({
    where: { schoolId: active.schoolId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Journal d&apos;audit — {active.schoolName}
      </h1>

      <Reveal className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Acteur</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Cible</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-stone-400 dark:text-stone-500">
                  Aucune action journalisée pour le moment.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-stone-50 transition last:border-0 hover:bg-stone-50/60 dark:border-stone-800 dark:hover:bg-stone-800/60"
              >
                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-stone-500 dark:text-stone-400">
                  {entry.createdAt.toLocaleDateString("fr-BE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  {entry.createdAt.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-5 py-3.5 text-stone-700 dark:text-stone-300">
                  {entry.actor.firstName} {entry.actor.lastName}
                </td>
                <td className="px-5 py-3.5 text-stone-700 dark:text-stone-300">{actionLabel[entry.action] ?? entry.action}</td>
                <td className="px-5 py-3.5 text-xs text-stone-400 dark:text-stone-500">
                  {entry.targetType ? `${entry.targetType} · ${entry.targetId}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </div>
  );
}
