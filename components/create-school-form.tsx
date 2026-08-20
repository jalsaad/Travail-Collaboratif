"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import {
  createSchool,
  lookupFwbSchool,
  type CreateSchoolState,
  type FwbLookup,
} from "@/app/(auth)/creer-ecole/actions";
import { RESEAU_OPTIONS, isReseauEtranger } from "@/lib/reseau-options";
import { REGION_OPTIONS } from "@/lib/region-options";
import { SchoolRegionField } from "@/components/school-region-field";
import { NIVEAU_OPTIONS, TYPE_ENSEIGNEMENT_OPTIONS } from "@/lib/school-classification-options";
import { AddressFields } from "@/components/address-fields";
import { PasswordInput } from "@/components/password-input";

const initialState: CreateSchoolState = {};

const FONCTION_OPTIONS = ["Direction", "Direction adjointe", "Autre"] as const;

export function CreateSchoolForm() {
  const [state, formAction, pending] = useActionState(createSchool, initialState);

  // Le réseau pilote la saisie de l'adresse : une école à programme belge à
  // l'étranger n'a ni code postal belge, ni zone FWB, et doit préciser son pays.
  const [reseau, setReseau] = useState("");
  const etranger = isReseauEtranger(reseau);
  const [fonction, setFonction] = useState<string>("Direction");

  // Champs préremplis depuis l'annuaire de la FWB. Contrôlés — et non laissés
  // à leur valeur par défaut — parce qu'ils changent APRÈS le premier rendu,
  // au retour de la recherche par numéro FASE.
  const [numeroFase, setNumeroFase] = useState("");
  const [name, setName] = useState("");
  const [niveaux, setNiveaux] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  // Région et adresse vivent dans des composants partagés qui lisent leurs
  // props une seule fois : les remonter via une clé est plus sûr que de les
  // convertir en champs contrôlés à trois endroits.
  const [prefill, setPrefill] = useState<{ region: string; address: string; postalCode: string; locality: string }>(
    { region: "", address: "", postalCode: "", locality: "" }
  );
  const [cle, setCle] = useState(0);
  const [resultat, setResultat] = useState<FwbLookup | null>(null);
  const [recherche, demarrerRecherche] = useTransition();

  const bascule = (liste: string[], valeur: string) =>
    liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];

  function chercher() {
    const saisi = numeroFase.trim();
    if (saisi === "") return;
    demarrerRecherche(async () => {
      const trouve = await lookupFwbSchool(saisi);
      setResultat(trouve);
      if (!trouve.found) return;
      setName(trouve.name);
      // Un réseau sans équivalent dans la liste de la plateforme laisse le
      // menu vide plutôt que d'imposer une valeur fausse.
      if (trouve.reseau) setReseau(trouve.reseau);
      setNiveaux(trouve.niveaux);
      setTypes(trouve.typesEnseignement);
      setPrefill({
        region: trouve.region ?? "",
        address: trouve.address ?? "",
        postalCode: trouve.postalCode ?? "",
        locality: trouve.locality ?? "",
      });
      setCle((c) => c + 1);
    });
  }

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      {/* En tête du formulaire : un numéro suffit à remplir tout le reste.
          Le saisir plus bas aurait laissé la direction retaper des données
          que la Fédération publie déjà. */}
      <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/40">
        <label htmlFor="numeroFase" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Numéro FASE
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="numeroFase"
            name="numeroFase"
            required
            inputMode="numeric"
            value={numeroFase}
            onChange={(e) => setNumeroFase(e.target.value)}
            onBlur={chercher}
            placeholder="ex: 1006"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={chercher}
            disabled={recherche || numeroFase.trim() === ""}
            className="shrink-0 rounded-lg border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900"
          >
            {recherche ? "Recherche…" : "Rechercher"}
          </button>
        </div>

        {resultat?.found && !resultat.dejaInscrite && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            <strong>{resultat.name}</strong> trouvée dans l&apos;annuaire de la Fédération
            {resultat.implantationCount > 1 && ` (${resultat.implantationCount} implantations)`}. Les
            champs ci-dessous ont été préremplis : vérifiez-les et corrigez si nécessaire.
            {resultat.reseauIncertain &&
              " L'annuaire ne précise pas la confession : vérifiez le réseau proposé."}
          </p>
        )}
        {resultat?.found && resultat.dejaInscrite && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            <strong>{resultat.name}</strong> est déjà inscrite sur la plateforme. Demandez son code de
            rattachement à sa direction plutôt que de créer un second espace.
          </p>
        )}
        {resultat && !resultat.found && (
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            Ce numéro ne figure pas dans l&apos;annuaire de la Fédération. Ce n&apos;est pas bloquant :
            complétez les champs ci-dessous à la main.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Nom de l&apos;école
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="reseau" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Réseau ou PO
        </label>
        <select
          id="reseau"
          name="reseau"
          required
          value={reseau}
          onChange={(e) => setReseau(e.target.value)}
          className="input-field mt-1.5"
        >
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

      <SchoolRegionField
        key={`region-${cle}`}
        region={prefill.region}
        etranger={etranger}
        options={REGION_OPTIONS}
        required
        emptyOption={{ label: "— Sélectionner —", disabled: true }}
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
                  checked={niveaux.includes(option.value)}
                  onChange={() => setNiveaux((l) => bascule(l, option.value))}
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
                  checked={types.includes(option.value)}
                  onChange={() => setTypes((l) => bascule(l, option.value))}
                  className="h-4 w-4 rounded border-stone-300 dark:border-stone-700"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <AddressFields
        key={`adresse-${cle}`}
        address={prefill.address}
        postalCode={prefill.postalCode}
        locality={prefill.locality}
        required
        foreign={etranger}
      />

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Téléphone
        </label>
        <input id="phone" name="phone" type="tel" required className="input-field mt-1.5" />
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
          placeholder="ex : www.mon-ecole.be"
          className="input-field mt-1.5"
        />
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

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Création..." : "Créer l'espace de mon école"}
      </button>
    </form>
  );
}
