"use client";

import { useActionState } from "react";
import { updatePeriod, type UpdatePeriodState } from "@/app/(app)/mes-periodes/actions";
import { ColleaguePicker } from "@/components/colleague-picker";
import {
  ExternalParticipantsField,
  type ExternalParticipantDraft,
} from "@/components/external-participants-field";
import { PeriodScheduleFields } from "@/components/period-schedule-fields";
import { PeriodTypeFields } from "@/components/period-type-fields";
import { PeriodDescriptionField } from "@/components/period-description-field";
import { PilotageObjectivesField } from "@/components/pilotage-objectives-field";

const initialState: UpdatePeriodState = {};

export function EditPeriodForm({
  periodId,
  type,
  date,
  heureDebut,
  heureFin,
  natureActivite,
  description,
  objectifsPilotage,
  colleagues,
  selectedMembershipIds,
  externalParticipants,
}: {
  periodId: string;
  type: string;
  date: string;
  // Vides pour les périodes déclarées avant l'introduction de la plage horaire :
  // la modification est alors l'occasion de les renseigner (champs requis).
  heureDebut: string;
  heureFin: string;
  natureActivite: string;
  description: string;
  objectifsPilotage: string;
  colleagues: { membershipId: string; name: string }[];
  selectedMembershipIds: string[];
  externalParticipants: ExternalParticipantDraft[];
}) {
  const updatePeriodWithId = updatePeriod.bind(null, periodId);
  const [state, formAction, pending] = useActionState(updatePeriodWithId, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Toute modification remet la période en attente de revalidation par l&apos;ensemble des
        intervenants, vous y compris.
      </div>

      <PeriodTypeFields defaultType={type} defaultNatureActivite={natureActivite} />

      <PeriodScheduleFields
        defaultDate={date}
        defaultHeureDebut={heureDebut}
        defaultHeureFin={heureFin}
      />

      <PeriodDescriptionField defaultValue={description} />

      <PilotageObjectivesField defaultValue={objectifsPilotage} />

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Collègues à inviter</span>
        <div className="mt-1.5">
          <ColleaguePicker colleagues={colleagues} initialSelected={selectedMembershipIds} />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Autres personnes présentes <span className="font-normal text-stone-400">(facultatif)</span>
        </span>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          Éducateur·rice, direction, personnel ouvrier, intervenant·e externe… Ces personnes ne
          valident pas la période et leur présence n&apos;entre dans le quota de personne.
        </p>
        <div className="mt-1.5">
          <ExternalParticipantsField initial={externalParticipants} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
