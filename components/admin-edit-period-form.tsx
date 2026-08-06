"use client";

import { useActionState } from "react";
import { updatePeriodAsAdmin, type AdminPeriodActionState } from "@/app/admin/periodes/[periodId]/actions";
import { PeriodScheduleFields } from "@/components/period-schedule-fields";
import { PeriodTypeFields } from "@/components/period-type-fields";
import { PeriodDescriptionField } from "@/components/period-description-field";
import { PilotageObjectivesField } from "@/components/pilotage-objectives-field";

const initialState: AdminPeriodActionState = {};

export function AdminEditPeriodForm({
  periodId,
  returnTo,
  type,
  date,
  heureDebut,
  heureFin,
  natureActivite,
  description,
  objectifsPilotage,
}: {
  periodId: string;
  returnTo: string;
  type: string;
  date: string;
  // Vides pour les périodes déclarées avant l'introduction de la plage horaire.
  heureDebut: string;
  heureFin: string;
  natureActivite: string;
  description: string;
  objectifsPilotage: string;
}) {
  const updateWithContext = updatePeriodAsAdmin.bind(null, periodId, returnTo);
  const [state, formAction, pending] = useActionState(updateWithContext, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Toute modification remet la période en attente de revalidation par l&apos;ensemble des
        intervenants.
      </div>

      <PeriodTypeFields defaultType={type} defaultNatureActivite={natureActivite} />

      <PeriodScheduleFields
        defaultDate={date}
        defaultHeureDebut={heureDebut}
        defaultHeureFin={heureFin}
      />

      <PeriodDescriptionField defaultValue={description} />

      <PilotageObjectivesField defaultValue={objectifsPilotage} />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
