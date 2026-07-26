import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnnouncementForm } from "@/components/announcement-form";

export default async function ModifierAnnoncePage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const { announcementId } = await params;

  const [announcement, schools, disciplines] = await Promise.all([
    prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { targets: true, media: true },
    }),
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!announcement) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Modifier l&apos;annonce</h1>
      <AnnouncementForm
        schools={schools}
        disciplines={disciplines}
        announcement={{
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          targets: announcement.targets.map((t) => ({
            role: t.role,
            schoolId: t.schoolId,
            reseau: t.reseau,
            disciplineId: t.disciplineId,
          })),
          media: announcement.media.map((m) => ({ id: m.id, type: m.type, url: m.url })),
        }}
      />
    </div>
  );
}
