import { prisma } from "@/lib/prisma";
import {
  ARCHIVE_RETENTION,
  ArchiveError,
  listArchivedYears,
  nextSchoolYear,
  resolveArchiveRoot,
} from "@/lib/school-year-archive";
import { AdminArchivePanel } from "@/components/admin-archive-panel";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

export default async function AdminArchivesPage() {
  const current = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });

  const [periodCount, archivedYears] = await Promise.all([
    current ? prisma.collaborativePeriod.count({ where: { schoolYearId: current.id } }) : 0,
    listArchivedYears(),
  ]);

  let nextLabel: string | null = null;
  if (current) {
    try {
      nextLabel = nextSchoolYear(current.label).label;
    } catch (error) {
      // Libellé non conforme à "YYYY-YYYY" : le panneau reste affiché et
      // l'action serveur renverra le message d'erreur détaillé.
      if (!(error instanceof ArchiveError)) throw error;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Archivage de fin d&apos;année
      </h1>

      {!current && (
        <div className="card p-6 text-sm text-stone-500 dark:text-stone-400">
          Aucune année scolaire configurée : rien à archiver.
        </div>
      )}

      {current && (
        <Reveal>
          <AdminArchivePanel
            currentLabel={current.label}
            nextLabel={nextLabel}
            periodCount={periodCount}
          />
        </Reveal>
      )}

      <div>
        <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Archives sur le disque
        </h2>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {resolveArchiveRoot()} — les {ARCHIVE_RETENTION} dernières années sont conservées, les
          plus anciennes sont supprimées à chaque nouvel archivage.
        </p>
        <div className="card mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          {archivedYears.length === 0 && (
            <p className="p-5 text-sm text-stone-500 dark:text-stone-400">
              Aucune archive présente pour le moment.
            </p>
          )}
          {archivedYears.map((year) => (
            <div key={year} className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="font-medium text-stone-900 dark:text-stone-100">{year}</span>
              <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                archive.json + ecoles/*.pdf
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
