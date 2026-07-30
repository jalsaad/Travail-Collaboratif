import { ADMIN_DIRECTORY_COLUMNS } from "@/lib/admin-directory-export";

// Formulaire GET natif (comme ExportPanel) : les filtres actifs sont
// reportés en champs cachés pour que l'export reflète exactement la vue
// filtrée affichée à l'écran.
export function AdminUsersExportPanel({ hiddenFields }: { hiddenFields: [string, string][] }) {
  return (
    <form
      action="/api/admin/export/utilisateurs"
      className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/60"
    >
      {hiddenFields.map(([name, value]) => (
        <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
      ))}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Colonnes à exporter
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {ADMIN_DIRECTORY_COLUMNS.map((column) => (
            <label
              key={column.key}
              className="inline-flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300"
            >
              <input
                type="checkbox"
                name="columns"
                value={column.key}
                defaultChecked
                className="h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700"
              />
              {column.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-3 dark:border-stone-800">
        <button type="submit" name="format" value="csv" className="btn-secondary">
          Exporter (CSV)
        </button>
        <button type="submit" name="format" value="xlsx" className="btn-primary">
          Exporter (Excel)
        </button>
      </div>
    </form>
  );
}
