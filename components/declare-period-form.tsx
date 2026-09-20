"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createPeriod, type CreatePeriodState } from "@/app/(app)/declarer/actions";
import { ColleaguePicker } from "@/components/colleague-picker";
import { ColleagueInvitesField } from "@/components/colleague-invites-field";
import { ExternalParticipantsField } from "@/components/external-participants-field";
import { PeriodScheduleFields } from "@/components/period-schedule-fields";
import { PeriodTypeFields } from "@/components/period-type-fields";
import { PeriodDescriptionField } from "@/components/period-description-field";
import { PilotageObjectivesField } from "@/components/pilotage-objectives-field";

const initialState: CreatePeriodState = {};

export function DeclarePeriodForm({
  colleagues,
}: {
  colleagues: { membershipId: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPeriod, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <PeriodTypeFields />

      <PeriodScheduleFields />

      <PeriodDescriptionField />

      <PilotageObjectivesField />

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">Collègues à inviter</span>
        <div className="mt-1.5">
          <ColleaguePicker colleagues={colleagues} />
        </div>
      </div>

      {/* Inviter se fait ici, au moment où l'on constate qui manque dans le
          sélecteur ci-dessus — et non plus depuis une entrée de menu à part,
          qui obligeait à quitter sa déclaration pour y penser. */}
      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Collègues pas encore inscrits dans la plateforme{" "}
          <span className="font-normal text-stone-400">(facultatif)</span>
        </span>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          Chacun·e reçoit un lien par email : en créant son compte, il ou elle rejoint votre école et
          valide du même geste sa participation à cette période.
        </p>
        <div className="mt-1.5">
          <ColleagueInvitesField />
        </div>
        {/* Le lien/QR code a son propre formulaire (il s'obtient sans attendre
            l'enregistrement de la période) : impossible de l'imbriquer dans
            celui-ci, d'où le renvoi vers la page dédiée. Nouvel onglet, pour
            ne pas perdre la déclaration en cours. */}
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Pas son adresse email sous la main ?{" "}
          <Link
            href="/inviter"
            target="_blank"
            rel="noopener"
            className="font-medium text-brand-700 underline hover:no-underline dark:text-brand-400"
          >
            Obtenir un lien ou un QR code à lui transmettre
          </Link>
          .
        </p>
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Autres personnes présentes <span className="font-normal text-stone-400">(facultatif)</span>
        </span>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          Éducateur·rice, direction, personnel ouvrier, intervenant·e externe… Ces personnes ne
          valident pas la période et leur présence n&apos;entre dans le quota de personne.
        </p>
        <div className="mt-1.5">
          <ExternalParticipantsField />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement..." : "Déclarer la période"}
      </button>
    </form>
  );
}
