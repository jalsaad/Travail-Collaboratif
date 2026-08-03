"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createSchool, type CreateSchoolState } from "@/app/(auth)/creer-ecole/actions";
import { RESEAU_OPTIONS } from "@/lib/reseau-options";
import { REGION_OPTIONS } from "@/lib/region-options";
import { NIVEAU_OPTIONS, TYPE_ENSEIGNEMENT_OPTIONS } from "@/lib/school-classification-options";
import { PasswordInput } from "@/components/password-input";

const initialState: CreateSchoolState = {};

const FONCTION_OPTIONS = ["Direction", "Direction adjointe", "Autre"] as const;

export function CreateSchoolForm() {
  const [state, formAction, pending] = useActionState(createSchool, initialState);
  const [fonction, setFonction] = useState<string>("Direction");

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Nom de l&apos;école
        </label>
        <input id="name" name="name" required className="input-field mt-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reseau" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Réseau d&apos;enseignement
          </label>
          <select id="reseau" name="reseau" required defaultValue="" className="input-field mt-1.5">
            <option value="" disabled>
              — Sélectionner —
            </option>
            {RESEAU_OPTIONS.map((option) => (
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
          <input id="numeroFase" name="numeroFase" required className="input-field mt-1.5" />
        </div>
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Région
        </label>
        <select id="region" name="region" required defaultValue="" className="input-field mt-1.5">
          <option value="" disabled>
            — Sélectionner —
          </option>
          {REGION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

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
                  className="h-4 w-4 rounded border-stone-300 dark:border-stone-700"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Adresse
        </label>
        <input id="address" name="address" required className="input-field mt-1.5" />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Téléphone
        </label>
        <input id="phone" name="phone" type="tel" required className="input-field mt-1.5" />
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Logo de l&apos;école</span>
        <input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="input-field mt-1.5 text-sm"
        />
        <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
          Facultatif — PNG, JPEG, WEBP ou GIF, 3 Mo maximum. Modifiable plus tard.
        </p>
      </div>

      <div>
        <label htmlFor="fonction" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Fonction
        </label>
        <select
          id="fonction"
          name="fonction"
          required
          value={fonction}
          onChange={(e) => setFonction(e.target.value)}
          className="input-field mt-1.5"
        >
          {FONCTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {fonction === "Autre" && (
        <div>
          <label htmlFor="fonctionAutre" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Précisez votre fonction
          </label>
          <input id="fonctionAutre" name="fonctionAutre" required className="input-field mt-1.5" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Prénom
          </label>
          <input id="firstName" name="firstName" required className="input-field mt-1.5" />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Nom
          </label>
          <input id="lastName" name="lastName" required className="input-field mt-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Date de naissance
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            className="input-field mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="sex" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Sexe
          </label>
          <select id="sex" name="sex" required defaultValue="" className="input-field mt-1.5">
            <option value="" disabled>
              —
            </option>
            <option value="F">F</option>
            <option value="M">M</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="matriculeManual" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Numéro de matricule — 4 derniers chiffres
        </label>
        <input
          id="matriculeManual"
          name="matriculeManual"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          placeholder="ex: 6798"
          className="input-field mt-1.5"
        />
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          Les 7 premiers chiffres sont calculés automatiquement à partir du sexe et de la date de
          naissance.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-field mt-1.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Mot de passe
          </label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Confirmer le mot de passe
          </label>
          <PasswordInput
            id="passwordConfirmation"
            name="passwordConfirmation"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500">8 caractères minimum.</p>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Création..." : "Créer l'espace de mon école"}
      </button>
    </form>
  );
}
