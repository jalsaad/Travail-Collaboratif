import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { assertCanManageSchool, ForbiddenError } from "@/lib/school-authorization";
import { computePeriodStatus } from "@/lib/period-status";
import { periodTypeLabel } from "@/lib/period-labels";
import { formatTimeRange } from "@/lib/period-duration";
import { collaborativeActivityLabel } from "@/lib/collaborative-activities";
import { parseExportDateRange, InvalidExportRangeError } from "@/lib/export-range";
import { loadExportHeaderLogos } from "@/lib/export-logos";
import { buildPeriodsPdf, type ExportPeriodRow } from "@/lib/export-builders";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const active = await resolveActiveMembership(session.userId);
  if (!active) return NextResponse.redirect(new URL("/mes-periodes", request.url));

  try {
    // Re-vérification fraîche en DB, jamais session/active seuls — même
    // invariant que le reste de l'espace direction/référent.
    await assertCanManageSchool(session.userId, active.schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.redirect(new URL("/mes-periodes", request.url));
    }
    throw error;
  }

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

  // Jamais les userIds fournis par le client tels quels : on ne retient que
  // ceux qui correspondent réellement à un membre actif de CETTE école. La
  // portée (personne seule / lot / toute l'école) se déduit du nombre de
  // personnes retenues après cette vérification, pas d'un scope déclaré côté
  // client.
  const requestedUserIds = [...new Set(url.searchParams.getAll("userIds").filter(Boolean))];
  const targetMembers =
    requestedUserIds.length > 0
      ? await prisma.membership.findMany({
          where: { schoolId: active.schoolId, status: "ACTIVE", userId: { in: requestedUserIds } },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : [];
  const targetUserIds = targetMembers.map((m) => m.userId);

  const scope: "SCHOOL" | "INDIVIDUAL" | "BATCH" =
    targetUserIds.length === 0 ? "SCHOOL" : targetUserIds.length === 1 ? "INDIVIDUAL" : "BATCH";

  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });

  // Scopé sur l'année courante comme l'écran /ecole : après l'archivage de
  // fin d'année (cf. lib/school-year-archive.ts), le relevé collectif ne
  // ramène plus l'année précédente, dont le PDF figure dans l'archive disque.
  const periods = await prisma.collaborativePeriod.findMany({
    where: {
      ...(schoolYear ? { schoolYearId: schoolYear.id } : {}),
      ...(range.dateFilter ? { date: range.dateFilter } : {}),
      participants: {
        some: {
          membership: { schoolId: active.schoolId, status: "ACTIVE" },
          ...(targetUserIds.length > 0 ? { userId: { in: targetUserIds } } : {}),
        },
      },
    },
    include: {
      // Filtre obligatoire (cf. permissions.md) : jamais un include global
      // des participants, sinon fuite d'une autre école pour une période
      // inter-écoles.
      participants: {
        where: { membership: { schoolId: active.schoolId } },
        include: { user: true },
      },
    },
    orderBy: { date: "desc" },
  });

  const rows: ExportPeriodRow[] = periods.map((p) => ({
    date: p.date,
    horaire: formatTimeRange(p.heureDebut, p.heureFin) ?? "—",
    type: periodTypeLabel[p.type] ?? p.type,
    nature: collaborativeActivityLabel(p.natureActivite) ?? "—",
    description: p.description,
    objectifsPilotage: p.objectifsPilotage ?? "—",
    dureePeriodes: p.dureePeriodes.toString(),
    status: computePeriodStatus(p.participants),
    participants: p.participants.map((part) => `${part.user.firstName} ${part.user.lastName}`).join(", "),
  }));

  const title =
    scope === "INDIVIDUAL"
      ? `Relevé individuel — ${targetMembers[0].user.firstName} ${targetMembers[0].user.lastName}`
      : scope === "BATCH"
        ? `Relevé — ${targetMembers.length} personnes — ${active.schoolName}`
        : `Relevé collectif — ${active.schoolName}`;

  const logos = await loadExportHeaderLogos(active.schoolLogoUrl);
  const buffer = await buildPeriodsPdf(rows, title, logos);

  if (schoolYear) {
    await prisma.exportLog.create({
      data: {
        schoolId: active.schoolId,
        schoolYearId: schoolYear.id,
        scope,
        format: "PDF",
        targetUserId: scope === "INDIVIDUAL" ? targetUserIds[0] : null,
        targetUserIds: scope === "BATCH" ? targetUserIds : [],
        rangeStart: range.start,
        rangeEnd: range.end,
        requestedById: session.userId,
        fileUrl: request.url,
      },
    });
  }

  const filenamePrefix =
    scope === "INDIVIDUAL" ? "releve-individuel" : scope === "BATCH" ? "releve-lot" : "releve-collectif";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenamePrefix}.pdf"`,
    },
  });
}
