import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { computePeriodStatus } from "@/lib/period-status";
import { periodTypeLabel } from "@/lib/period-labels";
import { formatPeriodes, formatTimeRange } from "@/lib/period-duration";
import { collaborativeActivityLabel } from "@/lib/collaborative-activities";
import { parseExportDateRange, InvalidExportRangeError } from "@/lib/export-range";
import { loadExportHeaderLogos } from "@/lib/export-logos";
import { buildPeriodsPdf, type ExportPeriodRow } from "@/lib/export-builders";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { buildExportIdentity } from "@/lib/export-identity";
import { formatExternalParticipant } from "@/lib/external-participants";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const active = await resolveActiveMembership(session.userId);
  if (!active) return NextResponse.redirect(new URL("/mes-periodes", request.url));

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  if (format !== "pdf") {
    return NextResponse.json({ error: "Format invalide." }, { status: 400 });
  }

  let range;
  try {
    range = parseExportDateRange(url.searchParams);
  } catch (error) {
    if (error instanceof InvalidExportRangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  // L'année courante borne l'export comme elle borne l'écran /mes-periodes :
  // après un archivage de fin d'année, un relevé sans filtre de dates ne
  // ramène pas les périodes de l'année précédente (elles restent dans
  // l'archive disque, cf. lib/school-year-archive.ts).
  const schoolYear = await getCurrentSchoolYear();

  const periods = schoolYear
    ? await prisma.collaborativePeriod.findMany({
        where: {
          schoolYearId: schoolYear.id,
          participants: { some: { membershipId: active.membershipId } },
          ...(range.dateFilter ? { date: range.dateFilter } : {}),
        },
        // Périodes déclarées par soi-même OU par d'autres intervenant·es dès
        // lors qu'on y participe — le statut affiché (validée/en attente)
        // reflète la confirmation des pairs, jamais une validation direction.
        include: { participants: { include: { user: true } }, externalParticipants: true },
        orderBy: { date: "desc" },
      })
    : [];

  const rows: ExportPeriodRow[] = periods.map((p) => ({
    date: p.date,
    horaire: formatTimeRange(p.heureDebut, p.heureFin) ?? "—",
    type: periodTypeLabel[p.type] ?? p.type,
    nature: collaborativeActivityLabel(p.natureActivite) ?? "—",
    description: p.description,
    objectifsPilotage: p.objectifsPilotage ?? "—",
    dureePeriodes: formatPeriodes(p.dureePeriodes.toString()),
    status: computePeriodStatus(p.participants),
    participants: [
      ...p.participants.map((part) => `${part.user.firstName} ${part.user.lastName}`),
      ...p.externalParticipants.map(formatExternalParticipant),
    ].join(", "),
  }));

  const title = `Relevé individuel${schoolYear ? ` ${schoolYear.label}` : ""} — ${active.schoolName}`;
  const logos = await loadExportHeaderLogos(active.schoolLogoUrl);
  const identity = await buildExportIdentity(active.membershipId, schoolYear?.id ?? null);
  const buffer = await buildPeriodsPdf(rows, title, logos, identity);

  if (schoolYear) {
    await prisma.exportLog.create({
      data: {
        schoolId: active.schoolId,
        schoolYearId: schoolYear.id,
        scope: "INDIVIDUAL",
        format: "PDF",
        targetUserId: session.userId,
        rangeStart: range.start,
        rangeEnd: range.end,
        requestedById: session.userId,
        fileUrl: request.url,
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="releve-individuel.pdf"`,
    },
  });
}
