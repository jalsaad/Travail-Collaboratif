"use client";

import { useActionState } from "react";
import { updatePeriod, type UpdatePeriodState } from "@/app/(app)/mes-periodes/actions";
import { ColleaguePicker } from "@/components/colleague-picker";

const initialState: UpdatePeriodState = {};

export function EditPeriodForm({
  periodId,
  type,
  date,
  dureePeriodes,
  description,
  colleagues,
  selectedMembershipIds,
}: {
  periodId: string;
  type: string;
  date: string;
  dureePeriodes: string;
  description: string;
  colleagues: { membershipId: string; name: string }[];
  selectedMembershipIds: string[];
}) {
  const updatePeriodWithId = updatePeriod.bind(null, periodId);
  const [state, formAction, pending] = useActionState(updatePeriodWithId, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Toute modification remet la période en attente de revalidation par l&apos;ensemble des
        intervenants, vous y compris.
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Type
        </label>
        <select id="type" name="type" required defaultValue={type} className="input-field mt-1.5">
          <option value="COLLABORATION_PEDAGOGIQUE">Collaboration pédagogique</option>
          <option value="REUNION_EQUIPE">Réunion d&apos;équipe</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Date
          </label>
          <input
            id="date"
            type="date"
            name="date"
            required
            defaultValue={date}
            className="input-field mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="dureePeriodes" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Durée (périodes)
          </label>
          <input
            id="dureePeriodes"
            type="number"
            step="0.5"
            min="0.5"
            name="dureePeriodes"
            required
            defaultValue={dureePeriodes}
            className="input-field mt-1.5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={description}
          className="input-field mt-1.5"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Collègues à inviter</span>
        <div className="mt-1.5">
          <ColleaguePicker colleagues={colleagues} initialSelected={selectedMembershipIds} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
