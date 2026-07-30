"use client";

import { useActionState } from "react";
import { updateTeachingInfo, type TeachingInfoState } from "@/app/(app)/mon-profil/actions";
import { LevelHoursPicker } from "@/components/level-hours-picker";

const initialState: TeachingInfoState = {};

export function TeachingInfoForm({
  schoolName,
  levelHours,
  disciplines,
}: {
  schoolName: string;
  levelHours: { level: string; hours: number; discipline: string }[];
  disciplines: string[];
}) {
  const [state, formAction, pending] = useActionState(updateTeachingInfo, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">École actuelle</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{schoolName}</p>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          Ces informations s&apos;appliquent à l&apos;école actuellement sélectionnée. Changez d&apos;école
          via le menu pour modifier celles d&apos;un autre établissement. Si vous ne donnez pas cours,
          laissez cette section vide.
        </p>
      </div>

      <LevelHoursPicker defaultValues={levelHours} disciplines={disciplines} minRows={0} />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
