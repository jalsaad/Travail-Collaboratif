import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/role-labels";
import { AnnouncementForm } from "@/components/announcement-form";
import { AnnouncementRowActions } from "@/components/announcement-row-actions";
import { Reveal } from "@/components/reveal";

const statusLabel: Record<string, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Planifiée",
  PUBLISHED: "Publiée",
  ARCHIVED: "Archivée",
};

const statusStyle: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  SCHEDULED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PUBLISHED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ARCHIVED: "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500",
};

const mediaIcon: Record<string, string> = { IMAGE: "🖼️", VIDEO: "🎬", AUDIO: "🔊" };

export default async function AdminAnnoncesPage() {
  const [schools, disciplines, announcements] = await Promise.all([
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
    prisma.announcement.findMany({
      include: { targets: { include: { school: true, discipline: true } }, media: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Annonces</h1>

      <Reveal>
        <AnnouncementForm schools={schools} disciplines={disciplines} />
      </Reveal>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Annonces publiées ({announcements.length})
        </h2>
        <div className="mt-3 space-y-3">
          {announcements.length === 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">Aucune annonce publiée pour le moment.</p>
          )}
          {announcements.map((a, index) => (
            <Reveal key={a.id} delay={Math.min(index, 6) * 70} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{a.title}</p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{a.body}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[a.status]}`}>
                  {statusLabel[a.status] ?? a.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {a.targets.map((t, i) => (
                  <span key={t.id} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs italic text-brand-teal">ou</span>}
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {[
                        t.role && roleLabel[t.role],
                        t.school?.name,
                        t.reseau && `réseau ${t.reseau}`,
                        t.discipline?.name,
                      ]
                        .filter(Boolean)
                        .join(" + ") || "Tout le monde"}
                    </span>
                  </span>
                ))}
              </div>
              {a.media.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {a.media.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {mediaIcon[m.type] ?? "📎"} {m.type.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-stone-100 pt-3.5 dark:border-stone-800">
                <AnnouncementRowActions announcementId={a.id} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
