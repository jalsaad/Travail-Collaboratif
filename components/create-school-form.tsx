"use client";

import { useActionState } from "react";
import { createSchool, type CreateSchoolState } from "@/app/(auth)/creer-ecole/actions";
import { roleLabel } from "@/lib/role-labels";

const initialState: CreateSchoolState = {};

export function CreateSchoolForm() {
  const [state, formAction, pending] = useActionState(createSchool, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
          <input id="reseau" name="reseau" required className="input-field mt-1.5" />
        </div>
        <div>
          <label htmlFor="numeroFase" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Numéro FASE
          </label>
          <input id="numeroFase" name="numeroFase" required className="input-field mt-1.5" />
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
        <label htmlFor="role" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Votre rôle dans cette école
        </label>
        <select id="role" name="role" required defaultValue="DIRECTION" className="input-field mt-1.5">
          <option value="DIRECTION">{roleLabel.DIRECTION}</option>
          <option value="REFERENT_NUMERIQUE">{roleLabel.REFERENT_NUMERIQUE}</option>
        </select>
      </div>

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
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input-field mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Confirmer le mot de passe
          </label>
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input-field mt-1.5"
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
