import { REGION_ETRANGER } from "@/lib/reseau-options";

/// Champ Région d'une école, partagé par les trois formulaires (création,
/// paramètres direction, fiche admin).
///
/// Pour une école à programme belge à l'étranger la valeur est imposée : les
/// zones de la Fédération ne couvrent pas ces établissements. Le menu est
/// alors grisé et la valeur part par un champ caché — un <select> désactivé
/// n'étant pas soumis par le navigateur.
export function SchoolRegionField({
  region = "",
  etranger,
  options,
  required = false,
  emptyOption,
}: {
  region?: string;
  etranger: boolean;
  options: readonly string[];
  required?: boolean;
  /// Première entrée du menu : « — Sélectionner — » non sélectionnable à la
  /// création (le champ y est obligatoire), « — Aucune — » sélectionnable en
  /// édition (la colonne est nullable).
  emptyOption?: { label: string; disabled?: boolean };
}) {
  return (
    <div>
      <label htmlFor="region" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        Région
      </label>

      {etranger ? (
        <>
          <select
            id="region"
            disabled
            value={REGION_ETRANGER}
            className="input-field mt-1.5 cursor-not-allowed opacity-70"
          >
            <option value={REGION_ETRANGER}>{REGION_ETRANGER}</option>
          </select>
          <input type="hidden" name="region" value={REGION_ETRANGER} />
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Imposée par le réseau : les zones de la Fédération ne couvrent pas les écoles situées
            hors de Belgique.
          </p>
        </>
      ) : (
        <select
          id="region"
          name="region"
          required={required}
          defaultValue={region}
          className="input-field mt-1.5"
        >
          {emptyOption && (
            <option value="" disabled={emptyOption.disabled}>
              {emptyOption.label}
            </option>
          )}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
