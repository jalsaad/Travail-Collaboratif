import { prisma } from "@/lib/prisma";
import {
  ARCHIVE_RETENTION,
  ArchiveError,
  listArchivedYears,
  nextSchoolYear,
  resolveArchiveRoot,
} from "@/lib/school-year-archive";
import { schoolYearDates } from "@/lib/school-year-dates";
import { AdminArchivePanel } from "@/components/admin-archive-panel";
import {
  CreateSchoolYearForm,
  EditSchoolYearForm,
} from "@/components/admin-school-year-form";
import { Reveal } from "@/components/reveal";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export const dynamic = "force-dynamic";

export default async function AdminArchivesPage() {
  const current = await getCurrentSchoolYear();

  const [periodCount, archivedYears] = await Promise.all([
    current ? prisma.collaborativePeriod.count({ where: { schoolYearId: current.id } }) : 0,
    listArchivedYears(),
  ]);

  // <input type="date"> attend "AAAA-MM-JJ" ; les dates sont stockées en UTC
  // (cf. lib/school-year-dates.ts), on tranche donc l'ISO sans conversion.
  const asDay = (d: Date) => d.toISOString().slice(0, 10);

  let next: { label: string; startDate: Date; endDate: Date } | null = null;
  if (current) {
    try {
      next = nextSchoolYear(current.label);
    } catch (error) {
      // Libellé non conforme à "AAAA-AAAA" : le panneau reste affiché et
      // l'action serveur renverra le message d'erreur détaillé.
      if (!(error instanceof ArchiveError)) throw error;
    }
  }

  // Proposition pour une instance vierge : l'année scolaire en cours, ou celle
  // qui s'ouvre si l'on est déjà passé en août.
  const today = new Date();
  const suggested = schoolYearDates(
    today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Archivage de fin d&apos;année
      </h1>

      {!current && (
        <Reveal>
          <CreateSchoolYearForm
            defaultLabel={suggested.label}
            defaultStartDate={asDay(suggested.startDate)}
            defaultEndDate={asDay(suggested.endDate)}
          />
        </Reveal>
      )}

      {current && (
        <>
          <Reveal>
            <EditSchoolYearForm
              schoolYearId={current.id}
              label={current.label}
              startDate={asDay(current.startDate)}
              endDate={asDay(current.endDate)}
            />
          </Reveal>

          <Reveal>
            <AdminArchivePanel
              currentLabel={current.label}
              nextLabel={next?.label ?? null}
              nextStartDate={next ? asDay(next.startDate) : ""}
              nextEndDate={next ? asDay(next.endDate) : ""}
              periodCount={periodCount}
            />
          </Reveal>
        </>
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
