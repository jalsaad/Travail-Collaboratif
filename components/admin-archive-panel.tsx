"use client";

import { useActionState, useState } from "react";
import { archiveSchoolYear, type ArchiveActionState } from "@/app/admin/archives/actions";

const initialState: ArchiveActionState = {};

export function AdminArchivePanel({
  currentLabel,
  nextLabel,
  periodCount,
}: {
  currentLabel: string;
  nextLabel: string | null;
  periodCount: number;
}) {
  const [state, formAction, pending] = useActionState(archiveSchoolYear, initialState);
  const [confirmation, setConfirmation] = useState("");

  const ready = confirmation.trim() === currentLabel;

  return (
    <form action={formAction} className="card space-y-4 border-amber-300 p-6 dark:border-amber-800">
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        L&apos;archivage écrit sur le disque un relevé complet de{" "}
        <strong>{currentLabel}</strong> ({periodCount} période(s)), puis fait passer la plateforme
        sur {nextLabel ?? "l'année suivante"}. Les espaces Profs et Direction repartent alors de
        zéro. Aucune donnée n&apos;est supprimée de la base : les périodes archivées restent
        consultables depuis l&apos;administration.
      </div>

      <div>
        <label
          htmlFor="confirmation"
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Pour confirmer, recopiez l&apos;année à archiver : {currentLabel}
        </label>
        <input
          id="confirmation"
          name="confirmation"
          autoComplete="off"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="input-field mt-1.5"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !ready}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Archivage en cours..." : `Archiver ${currentLabel} et ouvrir ${nextLabel ?? "l'année suivante"}`}
      </button>
    </form>
  );
}
