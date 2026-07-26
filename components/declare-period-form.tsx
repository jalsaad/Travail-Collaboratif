"use client";

import { useActionState } from "react";
import { createPeriod, type CreatePeriodState } from "@/app/(app)/declarer/actions";
import { ColleaguePicker } from "@/components/colleague-picker";

const initialState: CreatePeriodState = {};

export function DeclarePeriodForm({
  colleagues,
}: {
  colleagues: { membershipId: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPeriod, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue="COLLABORATION_PEDAGOGIQUE"
          className="input-field mt-1.5"
        >
          <option value="COLLABORATION_PEDAGOGIQUE">Collaboration pédagogique</option>
          <option value="REUNION_EQUIPE">Réunion d&apos;équipe</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Date
          </label>
          <input id="date" type="date" name="date" required className="input-field mt-1.5" />
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
          className="input-field mt-1.5"
        />
      </div>

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
