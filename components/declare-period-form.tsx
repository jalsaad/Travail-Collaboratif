"use client";

import { useActionState } from "react";
import { createPeriod, type CreatePeriodState } from "@/app/(app)/declarer/actions";
import { ColleaguePicker } from "@/components/colleague-picker";
import { PeriodScheduleFields } from "@/components/period-schedule-fields";
import { PeriodTypeFields } from "@/components/period-type-fields";
import { PeriodDescriptionField } from "@/components/period-description-field";
import { PilotageObjectivesField } from "@/components/pilotage-objectives-field";

const initialState: CreatePeriodState = {};

export function DeclarePeriodForm({
  colleagues,
}: {
  colleagues: { membershipId: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPeriod, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <PeriodTypeFields />

      <PeriodScheduleFields />

      <PeriodDescriptionField />

      <PilotageObjectivesField />

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Collègues à inviter</span>
        <div className="mt-1.5">
          <ColleaguePicker colleagues={colleagues} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement..." : "Déclarer la période"}
      </button>
    </form>
  );
}
