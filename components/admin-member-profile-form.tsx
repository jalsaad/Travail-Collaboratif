"use client";

import { useActionState } from "react";
import { updateMemberAsAdmin, type AdminActionState } from "@/app/admin/ecoles/[schoolId]/actions";

const initialState: AdminActionState = {};

export function AdminMemberProfileForm({
  membershipId,
  firstName,
  lastName,
  email,
  dateOfBirth,
  sex,
  matricule,
}: {
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  sex: string;
  matricule: string;
}) {
  const [state, formAction, pending] = useActionState(updateMemberAsAdmin, initialState);
  // Les 4 derniers chiffres du matricule sont ceux encodés manuellement à la
  // création du compte (cf. lib/matricule.ts) — les 7 premiers sont
  // recalculés automatiquement à partir du sexe/de la date de naissance,
  // jamais resaisis tels quels.
  const matriculeManual = matricule.slice(-4);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <input type="hidden" name="membershipId" value={membershipId} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Prénom
          </label>
          <input id="firstName" name="firstName" defaultValue={firstName} required className="input-field mt-1.5" />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Nom
          </label>
          <input id="lastName" name="lastName" defaultValue={lastName} required className="input-field mt-1.5" />
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

      {/* Identité saisie à la création du compte (cf. app/(auth)/creer-ecole
          et app/(auth)/rejoindre) — nullable pour les comptes antérieurs à
          cette fonctionnalité, donc affichée mais jamais imposée ici. */}
      <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Date de naissance
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={dateOfBirth}
            className="input-field mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="sex" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Sexe
          </label>
          <select id="sex" name="sex" defaultValue={sex} className="input-field mt-1.5">
            <option value="">—</option>
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
          defaultValue={matriculeManual}
          placeholder="ex: 6798"
          className="input-field mt-1.5"
        />
        <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
          {matricule
            ? `Matricule actuel : ${matricule}. Les 7 premiers chiffres sont recalculés à partir du sexe et de la date de naissance ci-dessus.`
            : "Aucun matricule enregistré — renseignez le sexe, la date de naissance et ces 4 chiffres pour en calculer un."}
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
