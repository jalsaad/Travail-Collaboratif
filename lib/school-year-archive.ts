import { mkdir, readdir, rename, rm, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { computePeriodStatus } from "@/lib/period-status";
import { periodTypeLabel } from "@/lib/period-labels";
import { formatPeriodes, formatTimeRange } from "@/lib/period-duration";
import { collaborativeActivityLabel } from "@/lib/collaborative-activities";
import { schoolYearDates } from "@/lib/school-year-dates";
import { loadExportHeaderLogos } from "@/lib/export-logos";
import { buildPeriodsPdf, type ExportPeriodRow } from "@/lib/export-builders";
import { formatExternalParticipant } from "@/lib/external-participants";
import { formatExportRange } from "@/lib/export-range";

// Archivage de fin d'année scolaire.
//
// L'opération n'efface RIEN en base : elle écrit une archive complète de
// l'année qui se termine sur le disque d'archives, puis crée la SchoolYear
// suivante. Comme toute l'application résout « l'année courante » par la
// SchoolYear la plus récente (findFirst orderBy startDate desc), cette simple
// création suffit à vider les espaces Profs et Direction, qui filtrent sur
// elle. Les périodes clôturées restent consultables côté administration et
// une attestation reste réémissible.

/// Racine du disque supplémentaire monté pour les archives. Comme pour le
/// stockage des fichiers uploadés (cf. lib/file-storage.ts), on retombe sur
/// un dossier local quand la variable n'est pas définie, pour que la
/// fonctionnalité soit testable en développement sans disque dédié.
export function resolveArchiveRoot(): string {
  return process.env.ARCHIVE_DIR || join(process.cwd(), "archives");
}

/// Nombre d'archives annuelles conservées sur le disque ; au-delà, les plus
/// anciennes sont supprimées à chaque nouvel archivage.
export const ARCHIVE_RETENTION = 3;

const LABEL_PATTERN = /^(\d{4})-(\d{4})$/;

export class ArchiveError extends Error {}

/// "2025-2026" -> "2026-2027", aux dates du calendrier FWB (dernier lundi
/// d'août -> premier vendredi de juillet, cf. lib/school-year-dates.ts).
export function nextSchoolYear(label: string): {
  label: string;
  startDate: Date;
  endDate: Date;
} {
  const match = LABEL_PATTERN.exec(label);
  if (!match) {
    throw new ArchiveError(
      `Libellé d'année scolaire inattendu ("${label}") : impossible d'en déduire l'année suivante.`
    );
  }
  return schoolYearDates(Number(match[2]));
}

function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "ecole"
  );
}

export type ArchiveSummary = {
  label: string;
  periodCount: number;
  schoolCount: number;
  path: string;
};

/// Archives présentes sur le disque, de la plus récente à la plus ancienne.
/// Les libellés "YYYY-YYYY" se trient lexicographiquement comme
/// chronologiquement, ce qui évite d'avoir à lire chaque archive.
export async function listArchivedYears(): Promise<string[]> {
  const root = resolveArchiveRoot();
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && LABEL_PATTERN.test(e.name))
      .map((e) => e.name)
      .sort()
      .reverse();
  } catch {
    // Disque pas encore monté ou dossier jamais créé : aucune archive.
    return [];
  }
}

async function purgeOldArchives(root: string, keep: number): Promise<string[]> {
  const years = await listArchivedYears();
  const obsolete = years.slice(keep);
  for (const year of obsolete) {
    await rm(join(root, year), { recursive: true, force: true });
  }
  return obsolete;
}

type ArchivedPeriod = Awaited<ReturnType<typeof loadPeriods>>[number];

function loadPeriods(schoolYearId: string) {
  return prisma.collaborativePeriod.findMany({
    where: { schoolYearId },
    include: {
      attachments: true,
      externalParticipants: true,
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, matricule: true } },
          membership: { select: { id: true, schoolId: true, role: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });
}

function toPdfRows(periods: ArchivedPeriod[], schoolId: string): ExportPeriodRow[] {
  return periods.map((p) => {
    // Même invariant que /api/export/school (cf. permissions.md) : un relevé
    // d'école ne montre que SES participants, jamais ceux d'une autre école
    // sur une période inter-écoles.
    const own = p.participants.filter((part) => part.membership.schoolId === schoolId);
    return {
      date: p.date,
      horaire: formatTimeRange(p.heureDebut, p.heureFin) ?? "—",
      type: periodTypeLabel[p.type] ?? p.type,
      nature: collaborativeActivityLabel(p.natureActivite) ?? "—",
      description: p.description,
      objectifsPilotage: p.objectifsPilotage ?? "—",
      dureePeriodes: formatPeriodes(p.dureePeriodes.toString()),
      participants: [
        ...own.map((part) => `${part.user.firstName} ${part.user.lastName}`),
        ...p.externalParticipants.map(formatExternalParticipant),
      ].join(", "),
    };
  });
}

/// Écrit l'archive complète de l'année sur le disque puis purge les archives
/// excédentaires. L'écriture se fait dans un dossier temporaire renommé en
/// dernier : un échec en cours de route ne détruit pas l'archive précédente
/// du même libellé.
export async function writeSchoolYearArchive(schoolYear: {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
}): Promise<ArchiveSummary & { purged: string[] }> {
  const root = resolveArchiveRoot();
  const finalDir = join(root, schoolYear.label);
  const stagingDir = join(root, `.${schoolYear.label}.partial`);

  const [periods, schools] = await Promise.all([
    loadPeriods(schoolYear.id),
    prisma.school.findMany({
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, matricule: true } },
            annualAssignments: { where: { schoolYearId: schoolYear.id } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Seules les écoles ayant au moins une période sur l'année reçoivent un PDF —
  // inutile de produire un relevé vide pour une école inscrite en cours d'année.
  const schoolsWithPeriods = schools.filter((school) =>
    periods.some((p) => p.participants.some((part) => part.membership.schoolId === school.id))
  );

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    schoolYear: {
      id: schoolYear.id,
      label: schoolYear.label,
      startDate: schoolYear.startDate.toISOString(),
      endDate: schoolYear.endDate.toISOString(),
    },
    schools: schools.map((school) => ({
      id: school.id,
      name: school.name,
      numeroFase: school.numeroFase,
      reseau: school.reseau,
      members: school.memberships.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        matricule: m.user.matricule,
        role: m.role,
        etp: m.annualAssignments[0]?.etp.toString() ?? null,
        objectifPeriodes: m.annualAssignments[0]?.objectifPeriodes.toString() ?? null,
      })),
    })),
    periods: periods.map((p) => ({
      id: p.id,
      type: p.type,
      date: p.date.toISOString(),
      heureDebut: p.heureDebut,
      heureFin: p.heureFin,
      // Valeur brute non localisée : l'archive JSON doit rester réimportable.
      dureePeriodes: p.dureePeriodes.toString(),
      natureActivite: p.natureActivite,
      description: p.description,
      objectifsPilotage: p.objectifsPilotage,
      createdByUserId: p.createdByUserId,
      createdAt: p.createdAt.toISOString(),
      status: computePeriodStatus(p.participants),
      participants: p.participants.map((part) => ({
        userId: part.user.id,
        membershipId: part.membership.id,
        schoolId: part.membership.schoolId,
        firstName: part.user.firstName,
        lastName: part.user.lastName,
        email: part.user.email,
        matricule: part.user.matricule,
        status: part.status,
        isInitiator: part.isInitiator,
        confirmedAt: part.confirmedAt?.toISOString() ?? null,
      })),
      // Métadonnées seulement : les fichiers eux-mêmes restent sur leur
      // stockage d'origine (cf. lib/file-storage.ts), l'archive ne les
      // duplique pas.
      attachments: p.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        uploadedById: a.uploadedById,
      })),
    })),
  };

  // Tout est produit avant la moindre écriture : si la génération d'un PDF
  // échoue, le disque n'a pas encore été touché.
  const pdfs = await Promise.all(
    schoolsWithPeriods.map(async (school) => ({
      fileName: `${slugify(school.name)}-${school.id.slice(-6)}.pdf`,
      buffer: await buildPeriodsPdf(
        toPdfRows(periods, school.id),
        {
          main: "Relevé collectif de travail collaboratif",
          periode: formatExportRange(null, null, schoolYear),
        },
        await loadExportHeaderLogos(school.logoUrl)
      ),
    }))
  );

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(join(stagingDir, "ecoles"), { recursive: true });
  await writeFile(join(stagingDir, "archive.json"), JSON.stringify(payload, null, 2), "utf8");
  for (const pdf of pdfs) {
    await writeFile(join(stagingDir, "ecoles", pdf.fileName), pdf.buffer);
  }
  await rm(finalDir, { recursive: true, force: true });
  await rename(stagingDir, finalDir);

  const purged = await purgeOldArchives(root, ARCHIVE_RETENTION);

  return {
    label: schoolYear.label,
    periodCount: periods.length,
    schoolCount: pdfs.length,
    path: finalDir,
    purged,
  };
}
