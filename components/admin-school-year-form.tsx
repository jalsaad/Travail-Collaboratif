"use client";

import { useActionState } from "react";
import {
  createSchoolYear,
  updateSchoolYearDates,
  type ArchiveActionState,
} from "@/app/admin/archives/actions";

const initialState: ArchiveActionState = {};

// Deux champs de dates saisissables plutôt qu'un calcul figé : la FWB déroge
// certaines années à la règle « dernier lundi d'août -> premier vendredi de
// juillet ». Le calcul (lib/school-year-dates.ts) ne sert qu'au
// pré-remplissage, côté page.
export function SchoolYearDateFields({
  startDate,
  endDate,
  prefix = "",
}: {
  startDate: string;
  endDate: string;
  prefix?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label
          htmlFor={`${prefix}startDate`}
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Date de début
        </label>
        <input
          id={`${prefix}startDate`}
          name={`${prefix}startDate`}
          type="date"
          required
          defaultValue={startDate}
          className="input-field mt-1.5"
        />
      </div>
      <div>
        <label
          htmlFor={`${prefix}endDate`}
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Date de fin
        </label>
        <input
          id={`${prefix}endDate`}
          name={`${prefix}endDate`}
          type="date"
          required
          defaultValue={endDate}
          className="input-field mt-1.5"
        />
      </div>
    </div>
  );
}

function Feedback({ state }: { state: ArchiveActionState }) {
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.success)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {state.success}
      </p>
    );
  return null;
}

/// Ouverture de la toute première année scolaire de l'instance.
export function CreateSchoolYearForm({
  defaultLabel,
  defaultStartDate,
  defaultEndDate,
}: {
  defaultLabel: string;
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [state, formAction, pending] = useActionState(createSchoolYear, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-200">
        Aucune année scolaire n&apos;est ouverte : les enseignant·es ne peuvent donc pas déclarer de
        période. Les dates proposées suivent le calendrier FWB (dernier lundi d&apos;août au premier
        vendredi de juillet) ; ajustez-les si la Fédération y a dérogé.
      </p>

      <div>
        <label htmlFor="label" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Année scolaire
        </label>
        <input
          id="label"
          name="label"
          required
          pattern="\d{4}-\d{4}"
          defaultValue={defaultLabel}
          className="input-field mt-1.5"
        />
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Format AAAA-AAAA. Sert aussi de nom de dossier aux archives, et n&apos;est plus
          modifiable ensuite.
        </p>
      </div>

      <SchoolYearDateFields startDate={defaultStartDate} endDate={defaultEndDate} />

      <Feedback state={state} />

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Ouverture..." : "Ouvrir l'année scolaire"}
      </button>
    </form>
  );
}

/// Correction des bornes d'une année déjà ouverte.
export function EditSchoolYearForm({
  schoolYearId,
  label,
  startDate,
  endDate,
}: {
  schoolYearId: string;
  label: string;
  startDate: string;
  endDate: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateSchoolYearDates.bind(null, schoolYearId),
    initialState
  );

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
          Année courante — {label}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Les dates n&apos;empêchent aucune saisie : elles documentent le calendrier. C&apos;est
          l&apos;année dont la date de début est la plus récente qui fait foi partout dans
          l&apos;application.
        </p>
      </div>

      <SchoolYearDateFields startDate={startDate} endDate={endDate} />

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        {pending ? "Enregistrement..." : "Enregistrer les dates"}
      </button>
    </form>
  );
}
