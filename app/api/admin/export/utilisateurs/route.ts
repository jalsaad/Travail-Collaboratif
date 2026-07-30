import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertIsSuperAdmin } from "@/lib/admin-authorization";
import { ForbiddenError } from "@/lib/school-authorization";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseDirectoryFilters, queryDirectoryAll } from "@/lib/admin-directory";
import {
  ADMIN_DIRECTORY_COLUMNS,
  buildDirectoryCsv,
  buildDirectoryXlsx,
  type DirectoryColumnKey,
} from "@/lib/admin-directory-export";

const VALID_COLUMNS = new Set<string>(ADMIN_DIRECTORY_COLUMNS.map((c) => c.key));

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  try {
    await assertIsSuperAdmin(session.userId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.redirect(new URL("/mes-periodes", request.url));
    }
    throw error;
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Format invalide." }, { status: 400 });
  }

  const requestedColumns = url.searchParams.getAll("columns");
  const columns = (
    requestedColumns.length > 0
      ? requestedColumns.filter((c): c is DirectoryColumnKey => VALID_COLUMNS.has(c))
      : ADMIN_DIRECTORY_COLUMNS.map((c) => c.key)
  ) as DirectoryColumnKey[];
  if (columns.length === 0) {
    return NextResponse.json({ error: "Aucune colonne valide sélectionnée." }, { status: 400 });
  }

  const filters = parseDirectoryFilters(url.searchParams);
  const rows = await queryDirectoryAll(filters);

  await logAudit({
    schoolId: null,
    actorId: session.userId,
    action: AuditAction.EXPORT_USERS_DIRECTORY,
    metadata: { filters, columns, format, rowCount: rows.length },
  });

  if (format === "csv") {
    const csv = buildDirectoryCsv(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="annuaire-utilisateurs.csv"',
      },
    });
  }

  const buffer = await buildDirectoryXlsx(rows, columns);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="annuaire-utilisateurs.xlsx"',
    },
  });
}
