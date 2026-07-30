"use client";

import { useActionState } from "react";
import { updateSchoolInfo, type SchoolActionState } from "@/app/(app)/ecole/parametres/actions";
import { reseauOptionsWithLegacy } from "@/lib/reseau-options";

const initialState: SchoolActionState = {};

export function SchoolSettingsForm({
  name,
  reseau,
  address,
  logoUrl,
  numeroFase,
}: {
  name: string;
  reseau: string;
  address: string;
  logoUrl: string;
  numeroFase: string;
}) {
  const [state, formAction, pending] = useActionState(updateSchoolInfo, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6" encType="multipart/form-data">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Nom de l&apos;école
        </label>
        <input id="name" name="name" defaultValue={name} required className="input-field mt-1.5" />
      </div>

      <div>
        <label htmlFor="reseau" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Réseau d&apos;enseignement
        </label>
        <select id="reseau" name="reseau" defaultValue={reseau} className="input-field mt-1.5">
          <option value="">— Aucun —</option>
          {reseauOptionsWithLegacy(reseau).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Adresse
        </label>
        <input id="address" name="address" defaultValue={address} className="input-field mt-1.5" />
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Logo de l&apos;école</span>
        <div className="mt-1.5 flex items-center gap-3">
          {/* Tant que l'école n'a pas encore chargé son propre logo, on
              affiche le logo générique TC3d.png en substitution — même
              invariant que components/school-logo-badge.tsx et
              lib/export-logos.ts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || "/TC3d.png"}
            alt={logoUrl ? "Logo actuel" : "Travail Collaboratif"}
            className="h-12 w-12 rounded-lg object-contain"
          />
          <input
            id="logoFile"
            name="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="input-field text-sm"
          />
        </div>
        <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">PNG, JPEG, WEBP ou GIF — 3 Mo maximum.</p>
      </div>

      <div>
        <label htmlFor="numeroFase" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Numéro FASE
        </label>
        <input
          id="numeroFase"
          value={numeroFase}
          disabled
          className="input-field mt-1.5 bg-stone-50 text-stone-400 dark:bg-stone-800 dark:text-stone-500"
        />
        <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
          Identifiant officiel — non modifiable depuis cet écran.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
