"use client";

import { useCallback, useRef, useState } from "react";
import { useActionState } from "react";
import { submitJoin, type JoinState } from "@/app/(auth)/rejoindre/actions";
import { SchoolChoiceFields, type SchoolChoiceMode } from "@/components/school-choice-fields";
import { LevelHoursPicker } from "@/components/level-hours-picker";
import { PasswordInput } from "@/components/password-input";
import { PrivacyPolicyCheckbox } from "@/components/privacy-policy-checkbox";

const initialState: JoinState = {};

export function JoinForm({ defaultCode }: { defaultCode: string }) {
  const [state, formAction, pending] = useActionState(submitJoin, initialState);
  // Le choix de l'école vit dans SchoolChoiceFields (partagé avec
  // components/join-school-form.tsx) ; seul son état résumé remonte ici, pour
  // piloter le bouton « Continuer » et le libellé d'envoi.
  const [choix, setChoix] = useState<{ mode: SchoolChoiceMode; prete: boolean }>({
    mode: defaultCode ? "code" : "school",
    prete: true,
  });
  const onChoixChange = useCallback(
    (etat: { mode: SchoolChoiceMode; prete: boolean }) => setChoix(etat),
    []
  );
  const formRef = useRef<HTMLFormElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  // Formulaire long à plat : découpé en deux écrans (école, puis niveaux +
  // identité + identifiants) — même mécanique que components/create-school-
  // form.tsx (un seul POST final, `hidden` plutôt qu'un rendu conditionnel
  // pour garder tous les champs montés entre les deux écrans).
  const [step, setStep] = useState<1 | 2>(1);
  const ecoleChoisie = choix.prete;

  // `display:none` (la classe `hidden`) ne dispense pas un champ requis de la
  // validation native — seul `disabled` le fait. Sans ce détour, les champs
  // requis de l'étape 2 (prénom, email, mot de passe...), encore vides,
  // rendaient tout le formulaire perpétuellement invalide et bloquaient
  // "Continuer" sans le moindre message visible.
  function suivant() {
    if (!ecoleChoisie) return;
    const champsEtape2 = step2Ref.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input, select, textarea"
    );
    champsEtape2?.forEach((c) => (c.disabled = true));
    const valide = formRef.current?.reportValidity() ?? true;
    champsEtape2?.forEach((c) => (c.disabled = false));
    if (!valide) return;
    setStep(2);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function precedent() {
    setStep(1);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
        <span className={step === 1 ? "text-brand-700 dark:text-brand-400" : ""}>1. École</span>
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        <span className={step === 2 ? "text-brand-700 dark:text-brand-400" : ""}>2. Vos informations</span>
      </div>

      <div className={step === 1 ? "space-y-4" : "hidden"}>
      {/* Dans l'étape 1 : « Continuer » la valide (reportValidity), rien ne
          peut donc être saisi en étape 2 sans prise de connaissance. */}
      <PrivacyPolicyCheckbox />

      <SchoolChoiceFields defaultCode={defaultCode} onChange={onChoixChange} />

      <button type="button" onClick={suivant} disabled={!ecoleChoisie} className="btn-primary w-full">
        Continuer
      </button>
      {/* Un bouton grisé sans explication se lit comme un bouton en panne. */}
      {!ecoleChoisie && (
        <p className="text-center text-xs text-stone-400 dark:text-stone-500">
          Choisissez d&apos;abord votre école dans les résultats de recherche.
        </p>
      )}
      </div>

      <div ref={step2Ref} className={step === 2 ? "space-y-4" : "hidden"}>
      <div>
        <LevelHoursPicker />
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
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Confirmation
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={precedent}
          className="shrink-0 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={pending || !ecoleChoisie}
          className="btn-primary flex-1"
        >
          {pending
            ? "Création du compte..."
            : choix.mode === "initiate"
              ? "Créer mon compte"
              : "Rejoindre l'école"}
        </button>
      </div>
      </div>
    </form>
  );
}
