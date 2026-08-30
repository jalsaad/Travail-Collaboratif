"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { submitJoin, type JoinState, type JoinableSchool } from "@/app/(auth)/rejoindre/actions";
import { JoinableSchoolSearch } from "@/components/joinable-school-search";
import { SchoolNameSearch } from "@/components/school-name-search";
import { LevelHoursPicker } from "@/components/level-hours-picker";
import { PasswordInput } from "@/components/password-input";

const initialState: JoinState = {};

export function JoinForm({ defaultCode }: { defaultCode: string }) {
  const [state, formAction, pending] = useActionState(submitJoin, initialState);
  // "code" par défaut seulement quand un lien de poster (cf.
  // lib/join-poster.ts) l'a déjà rempli en query param — sinon la recherche
  // par nom est le chemin le plus probable, la plupart des enseignants
  // n'ayant pas le code sous les yeux au moment de s'inscrire.
  const [mode, setMode] = useState<"code" | "school" | "initiate">(defaultCode ? "code" : "school");
  const [selectedSchool, setSelectedSchool] = useState<JoinableSchool | null>(null);
  const [numeroFaseAInitier, setNumeroFaseAInitier] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  // Formulaire long à plat : découpé en deux écrans (école, puis niveaux +
  // identité + identifiants) — même mécanique que components/create-school-
  // form.tsx (un seul POST final, `hidden` plutôt qu'un rendu conditionnel
  // pour garder tous les champs montés entre les deux écrans).
  const [step, setStep] = useState<1 | 2>(1);
  const ecoleChoisie =
    mode === "code" || (mode === "school" && !!selectedSchool) || (mode === "initiate" && !!numeroFaseAInitier);

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
      <div className="flex gap-1.5 rounded-lg bg-stone-100 p-1 text-sm dark:bg-stone-800">
        <button
          type="button"
          onClick={() => setMode("code")}
          className={`flex-1 rounded-md py-1.5 font-medium transition ${
            mode === "code"
              ? "bg-white text-brand-700 shadow-sm dark:bg-stone-700 dark:text-brand-300"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          J&apos;ai un code
        </button>
        <button
          type="button"
          onClick={() => setMode("school")}
          className={`flex-1 rounded-md py-1.5 font-medium transition ${
            mode === "school"
              ? "bg-white text-brand-700 shadow-sm dark:bg-stone-700 dark:text-brand-300"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          Chercher mon école
        </button>
        <button
          type="button"
          onClick={() => setMode("initiate")}
          className={`flex-1 rounded-md py-1.5 font-medium transition ${
            mode === "initiate"
              ? "bg-white text-brand-700 shadow-sm dark:bg-stone-700 dark:text-brand-300"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          Pas encore inscrite
        </button>
      </div>

      <input type="hidden" name="joinMode" value={mode === "initiate" ? "initiate" : "join"} />

      {mode === "code" && (
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Code de rattachement
          </label>
          <input
            id="code"
            name="code"
            defaultValue={defaultCode}
            placeholder="ex: TILL-2026-8K3"
            className="input-field mt-1.5 uppercase"
          />
        </div>
      )}

      {mode === "school" && (
        <div>
          <JoinableSchoolSearch onSelect={setSelectedSchool} selected={selectedSchool} />
          <input type="hidden" name="schoolId" value={selectedSchool?.id ?? ""} />
          <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
            Seules les écoles déjà inscrites et rattachables apparaissent dans les résultats.
          </p>
        </div>
      )}

      {mode === "initiate" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-xs text-stone-600 dark:border-brand-900 dark:bg-brand-950/40 dark:text-stone-400">
            Vous réunissez ici votre petit cercle de collègues. Vous restez enseignant·e — aucun droit
            de gestion sur l&apos;école ne vous est attribué. Votre direction sera informée par email et
            pourra inscrire l&apos;école officiellement pour en faire bénéficier toute l&apos;équipe.
          </div>
          <SchoolNameSearch onSelect={setNumeroFaseAInitier} />
          <input type="hidden" name="numeroFase" value={numeroFaseAInitier ?? ""} />
          <div>
            <label htmlFor="directionEmail" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Email de votre direction
            </label>
            <input
              id="directionEmail"
              name="directionEmail"
              type="email"
              required
              placeholder="ex: direction@ecole.be"
              className="input-field mt-1.5"
            />
          </div>
        </div>
      )}

      <button type="button" onClick={suivant} disabled={!ecoleChoisie} className="btn-primary w-full">
        Continuer
      </button>
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
          {pending ? "Création du compte..." : mode === "initiate" ? "Créer mon compte" : "Rejoindre l'école"}
        </button>
      </div>
      </div>
    </form>
  );
}
