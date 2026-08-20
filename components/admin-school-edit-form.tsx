"use client";

import { useActionState, useTransition, useState } from "react";
import {
  updateSchoolAsAdmin,
  deleteSchoolAsAdmin,
  type AdminActionState,
} from "@/app/admin/ecoles/[schoolId]/actions";
import { isReseauEtranger, reseauOptionsWithLegacy } from "@/lib/reseau-options";
import { regionOptionsWithLegacy } from "@/lib/region-options";
import { SchoolRegionField } from "@/components/school-region-field";
import { NIVEAU_OPTIONS, TYPE_ENSEIGNEMENT_OPTIONS } from "@/lib/school-classification-options";
import { AddressFields } from "@/components/address-fields";

const initialState: AdminActionState = {};

export function AdminSchoolEditForm({
  schoolId,
  name,
  reseau: reseauInitial,
  region,
  niveaux,
  typesEnseignement,
  address,
  postalCode,
  locality,
  country,
  phone,
  website,
  numeroFase,
  logoUrl,
}: {
  schoolId: string;
  name: string;
  reseau: string;
  region: string;
  niveaux: string[];
  typesEnseignement: string[];
  address: string;
  postalCode: string;
  locality: string;
  country: string;
  phone: string;
  website: string;
  numeroFase: string;
  logoUrl: string;
}) {
  const updateWithId = updateSchoolAsAdmin.bind(null, schoolId);
  const [state, formAction, pending] = useActionState(updateWithId, initialState);

  // Le réseau pilote la région et la saisie d'adresse — il doit donc être
  // contrôlé, sinon le formulaire ne réagirait qu'après enregistrement.
  const [reseau, setReseau] = useState(reseauInitial);
  const etranger = isReseauEtranger(reseau);
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Supprimer définitivement « ${name} » ? Toutes ses données (membres, périodes, codes de rattachement...) seront perdues. Cette action est irréversible.`
      )
    ) {
      return;
    }
    startDeleteTransition(() => {
      deleteSchoolAsAdmin(schoolId);
    });
  }

  return (
    <form action={formAction} className="card space-y-4 p-6" encType="multipart/form-data">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Nom de l&apos;école
        </label>
        <input id="name" name="name" defaultValue={name} required className="input-field mt-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reseau" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Réseau d&apos;enseignement
          </label>
          <select
            id="reseau"
            name="reseau"
            value={reseau}
            onChange={(e) => setReseau(e.target.value)}
            className="input-field mt-1.5"
          >
            <option value="">— Aucun —</option>
            {reseauOptionsWithLegacy(reseauInitial).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="numeroFase" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Numéro FASE
          </label>
          <input
            id="numeroFase"
            name="numeroFase"
            defaultValue={numeroFase}
            className="input-field mt-1.5"
          />
        </div>
      </div>

      <SchoolRegionField
        region={region}
        etranger={etranger}
        options={regionOptionsWithLegacy(region)}
        emptyOption={{ label: "— Aucune —" }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Niveaux</span>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {NIVEAU_OPTIONS.map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  name="niveaux"
                  value={option.value}
                  defaultChecked={niveaux.includes(option.value)}
                  className="h-4 w-4 rounded border-stone-300 dark:border-stone-700"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Type d&apos;enseignement
          </span>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {TYPE_ENSEIGNEMENT_OPTIONS.map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  name="typesEnseignement"
                  value={option.value}
                  defaultChecked={typesEnseignement.includes(option.value)}
                  className="h-4 w-4 rounded border-stone-300 dark:border-stone-700"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <AddressFields address={address} postalCode={postalCode} locality={locality} country={country}
        foreign={etranger}
      />

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Téléphone
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={phone} className="input-field mt-1.5" />
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Site web <span className="font-normal text-stone-400">(si l&apos;école en dispose)</span>
        </label>
        <input
          id="website"
          name="website"
          // Volontairement pas `type="url"` : la validation native du
          // navigateur exigerait un schéma explicite et rejetterait
          // « www.mon-ecole.be », la forme la plus couramment saisie. Le
          // serveur le complète (cf. lib/website-url.ts).
          type="text"
          inputMode="url"
          defaultValue={website}
          placeholder="ex : www.mon-ecole.be"
          className="input-field mt-1.5"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Logo de l&apos;école</span>
        <div className="mt-1.5 flex items-center gap-3">
          {/* Même invariant que components/school-settings-form.tsx : logo
              générique TC3d.png en substitution tant que l'école n'a pas
              importé le sien. */}
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

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <div className="flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          type="button"
          disabled={deletePending}
          onClick={handleDelete}
          className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {deletePending ? "Suppression..." : "Supprimer cette école"}
        </button>
      </div>
    </form>
  );
}
