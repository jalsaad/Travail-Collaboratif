"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateOwnProfile, type OwnProfileState } from "@/app/(app)/mon-profil/actions";
import { PasswordInput } from "@/components/password-input";

const initialState: OwnProfileState = {};

const sexLabel: Record<string, string> = { M: "Masculin", F: "Féminin" };

export function OwnProfileForm({
  firstName,
  lastName,
  email,
  dateOfBirth,
  sex,
  matricule,
}: {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date | null;
  sex: string | null;
  matricule: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, initialState);

  return (
    <form action={formAction} className="card space-y-6 p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Prénom
            </label>
            <input
              id="firstName"
              name="firstName"
              defaultValue={firstName}
              required
              className="input-field mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Nom
            </label>
            <input
              id="lastName"
              name="lastName"
              defaultValue={lastName}
              required
              className="input-field mt-1.5"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            required
            className="input-field mt-1.5"
          />
        </div>
      </div>

      <div className="border-t border-stone-100 pt-5 dark:border-stone-800">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Informations d&apos;identification</p>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          Ces champs servent au calcul de votre numéro de matricule et ne peuvent pas être modifiés
          ici : les changer casserait son unicité et pourrait perturber le bon fonctionnement de la
          plateforme. Une erreur ?{" "}
          <Link href="/assistance" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Contactez l&apos;assistance
          </Link>
          .
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Date de naissance
            </label>
            <input
              id="dateOfBirth"
              type="text"
              disabled
              readOnly
              value={
                dateOfBirth
                  ? dateOfBirth.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })
                  : "—"
              }
              className="input-field mt-1.5 disabled:bg-stone-50 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
            />
          </div>
          <div>
            <label htmlFor="sex" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Sexe
            </label>
            <input
              id="sex"
              type="text"
              disabled
              readOnly
              value={sex ? (sexLabel[sex] ?? sex) : "—"}
              className="input-field mt-1.5 disabled:bg-stone-50 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
            />
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="matricule" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Numéro de matricule
          </label>
          <input
            id="matricule"
            type="text"
            disabled
            readOnly
            value={matricule ?? "—"}
            className="input-field mt-1.5 disabled:bg-stone-50 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
          />
        </div>
      </div>

      <div className="border-t border-stone-100 pt-5 dark:border-stone-800">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Changer le mot de passe</p>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Laissez ces champs vides pour ne pas le modifier.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Mot de passe actuel
            </label>
            <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Nouveau mot de passe
              </label>
              <PasswordInput id="newPassword" name="newPassword" minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label
                htmlFor="newPasswordConfirmation"
                className="block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Confirmer
              </label>
              <PasswordInput
                id="newPasswordConfirmation"
                name="newPasswordConfirmation"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500">8 caractères minimum.</p>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
