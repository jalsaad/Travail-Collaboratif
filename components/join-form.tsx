"use client";

import { useActionState } from "react";
import { joinViaCode, type JoinState } from "@/app/(auth)/rejoindre/actions";
import { LevelHoursPicker } from "@/components/level-hours-picker";
import { PasswordInput } from "@/components/password-input";

const initialState: JoinState = {};

export function JoinForm({ defaultCode }: { defaultCode: string }) {
  const [state, formAction, pending] = useActionState(joinViaCode, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Code de rattachement
        </label>
        <input
          id="code"
          name="code"
          required
          defaultValue={defaultCode}
          placeholder="ex: TILL-2026-8K3"
          className="input-field mt-1.5 uppercase"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="border-t border-stone-100 pt-4 dark:border-stone-800">
        <LevelHoursPicker />
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
        {pending ? "Création du compte..." : "Rejoindre l'école"}
      </button>
    </form>
  );
}
