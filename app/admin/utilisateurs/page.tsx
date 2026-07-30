import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  parseDirectoryFilters,
  queryDirectoryPage,
  NIVEAU_LABEL,
  TYPE_ENSEIGNEMENT_LABEL,
} from "@/lib/admin-directory";
import { ADMIN_DIRECTORY_COLUMNS } from "@/lib/admin-directory-export";
import { AdminUsersExportPanel } from "@/components/admin-users-export-panel";

const PAGE_SIZE = 100;

function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

export default async function AdminUtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const urlParams = toSearchParams(resolvedSearchParams);
  const filters = parseDirectoryFilters(urlParams);
  const page = Math.max(1, parseInt(urlParams.get("page") ?? "1", 10) || 1);

  const [{ rows, total }, schools, reseauxRaw, regionsRaw, disciplines] = await Promise.all([
    queryDirectoryPage(filters, page, PAGE_SIZE),
    prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.school.findMany({
      where: { reseau: { not: null } },
      select: { reseau: true },
      distinct: ["reseau"],
      orderBy: { reseau: "asc" },
    }),
    prisma.school.findMany({
      where: { region: { not: null } },
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    }),
    prisma.discipline.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Champs cachés du panneau d'export = filtres actifs (hors pagination),
  // pour que l'export porte sur exactement le même sous-ensemble affiché.
  const hiddenFields: [string, string][] = [];
  if (filters.schoolId) hiddenFields.push(["schoolId", filters.schoolId]);
  if (filters.reseau) hiddenFields.push(["reseau", filters.reseau]);
  if (filters.region) hiddenFields.push(["region", filters.region]);
  filters.niveau.forEach((n) => hiddenFields.push(["niveau", n]));
  filters.typeEnseignement.forEach((t) => hiddenFields.push(["typeEnseignement", t]));
  if (filters.disciplineId) hiddenFields.push(["disciplineId", filters.disciplineId]);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(urlParams);
    params.set("page", String(targetPage));
    return `/admin/utilisateurs?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Utilisateurs</h1>

      <form className="card grid grid-cols-2 gap-3 p-6 sm:grid-cols-3" method="get">
        <div>
          <label htmlFor="schoolId" className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            École
          </label>
          <select
            id="schoolId"
            name="schoolId"
            defaultValue={filters.schoolId ?? ""}
            className="input-field mt-1 text-sm"
          >
            <option value="">Toutes</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reseau" className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Réseau
          </label>
          <select
            id="reseau"
            name="reseau"
            defaultValue={filters.reseau ?? ""}
            className="input-field mt-1 text-sm"
          >
            <option value="">Tous</option>
            {reseauxRaw.map((r) => (
              <option key={r.reseau} value={r.reseau!}>
                {r.reseau}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="region" className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Région
          </label>
          <select
            id="region"
            name="region"
            defaultValue={filters.region ?? ""}
            className="input-field mt-1 text-sm"
          >
            <option value="">Toutes</option>
            {regionsRaw.map((r) => (
              <option key={r.region} value={r.region!}>
                {r.region}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="block text-xs font-medium text-stone-600 dark:text-stone-400">Niveau</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {Object.entries(NIVEAU_LABEL).map(([value, label]) => (
              <label
                key={value}
                className="inline-flex items-center gap-1 text-xs text-stone-700 dark:text-stone-300"
              >
                <input
                  type="checkbox"
                  name="niveau"
                  value={value}
                  defaultChecked={(filters.niveau as string[]).includes(value)}
                  className="h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Type d&apos;enseignement
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {Object.entries(TYPE_ENSEIGNEMENT_LABEL).map(([value, label]) => (
              <label
                key={value}
                className="inline-flex items-center gap-1 text-xs text-stone-700 dark:text-stone-300"
              >
                <input
                  type="checkbox"
                  name="typeEnseignement"
                  value={value}
                  defaultChecked={(filters.typeEnseignement as string[]).includes(value)}
                  className="h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="disciplineId" className="block text-xs font-medium text-stone-600 dark:text-stone-400">
            Discipline
          </label>
          <select
            id="disciplineId"
            name="disciplineId"
            defaultValue={filters.disciplineId ?? ""}
            className="input-field mt-1 text-sm"
          >
            <option value="">Toutes</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex items-end gap-3 sm:col-span-3">
          <button type="submit" className="btn-primary">
            Filtrer
          </button>
          <Link href="/admin/utilisateurs" className="text-sm text-brand-700 hover:underline dark:text-brand-500">
            Réinitialiser
          </Link>
        </div>
      </form>

      <AdminUsersExportPanel hiddenFields={hiddenFields} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
              {ADMIN_DIRECTORY_COLUMNS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={ADMIN_DIRECTORY_COLUMNS.length}
                  className="px-4 py-8 text-center text-stone-400 dark:text-stone-500"
                >
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-stone-50 last:border-0 dark:border-stone-800">
                {ADMIN_DIRECTORY_COLUMNS.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-stone-700 dark:text-stone-300">
                    {row[c.key] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
        <p>
          {total} résultat{total > 1 ? "s" : ""} — page {page}/{totalPages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              ← Précédent
            </Link>
          )}
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              Suivant →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
