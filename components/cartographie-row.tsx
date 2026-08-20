"use client";

import { useActionState, useState } from "react";
import type { ProspectionStatus, SchoolStatus } from "@prisma/client";
import { updateProspection, type ProspectionState } from "@/app/admin/cartographie/actions";
import { PROSPECTION_STATUSES, prospectionBadge, prospectionLabel } from "@/lib/prospection-labels";

const initialState: ProspectionState = {};

export type CartographieEcole = {
  numeroFase: string;
  name: string;
  reseau: string;
  postalCode: string | null;
  locality: string | null;
  commune: string | null;
  bassin: string | null;
  address: string | null;
  implantationCount: number;
  poName: string | null;
  emailDirection: string | null;
  poEmail: string | null;
  phone: string | null;
  website: string | null;
  prospectionStatus: ProspectionStatus;
  /// Déjà au format d'un <input type="date">, la conversion revenant au serveur.
  lastContactedAt: string;
  notes: string | null;
};

// Une ligne du tableau, dépliable sur son panneau de suivi. Le panneau n'est
// monté qu'à l'ouverture : cinquante formulaires par page, tous montés, pour
// n'en remplir qu'un seul, ne se justifierait pas.
export function CartographieRow({
  ecole,
  inscrite,
}: {
  ecole: CartographieEcole;
  /// L'école correspondante sur la plateforme, retrouvée par son numéro FASE.
  inscrite: { name: string; status: SchoolStatus } | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [state, formAction, pending] = useActionState(updateProspection, initialState);

  return (
    <>
      <tr className="border-b border-stone-50 last:border-0 dark:border-stone-800">
        <td className="px-5 py-3">
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            className="text-left font-medium text-stone-900 underline decoration-dotted underline-offset-2 transition hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-500"
          >
            {ecole.name}
          </button>
          {ecole.implantationCount > 1 && (
            <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-500">
              {ecole.implantationCount} implantations
            </span>
          )}
        </td>
        <td className="px-5 py-3 text-xs text-stone-500 dark:text-stone-400">{ecole.numeroFase}</td>
        <td className="px-5 py-3 text-xs text-stone-500 dark:text-stone-400">{ecole.reseau}</td>
        <td className="px-5 py-3 text-xs text-stone-500 dark:text-stone-400">
          {ecole.postalCode} {ecole.locality}
        </td>
        <td className="px-5 py-3 text-xs text-stone-500 dark:text-stone-400">{ecole.bassin ?? "—"}</td>
        <td className="px-5 py-3">
          {inscrite ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {inscrite.status === "APPROVED" ? "Inscrite" : "En attente"}
            </span>
          ) : (
            <span className="text-xs text-stone-400 dark:text-stone-500">—</span>
          )}
        </td>
        <td className="px-5 py-3">
          {/* Le suivi ne veut rien dire pour une école déjà là : le but est
              atteint, il n'y a plus personne à relancer. */}
          {inscrite ? (
            <span className="text-xs text-stone-400 dark:text-stone-500">—</span>
          ) : (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${prospectionBadge(ecole.prospectionStatus)}`}>
              {prospectionLabel(ecole.prospectionStatus)}
            </span>
          )}
        </td>
      </tr>

      {ouvert && (
        <tr className="border-b border-stone-100 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/50">
          <td colSpan={7} className="px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="text-xs text-stone-500 dark:text-stone-400">
                <p className="font-semibold text-stone-700 dark:text-stone-300">Annuaire officiel</p>
                <p className="mt-1">{ecole.address ?? "Adresse non renseignée"}</p>
                <p>
                  {ecole.postalCode} {ecole.locality}
                  {ecole.commune && ecole.commune !== ecole.locality && ` · ${ecole.commune}`}
                </p>
                {ecole.poName && <p className="mt-2">Pouvoir organisateur : {ecole.poName}</p>}
                {inscrite && (
                  <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                    Inscrite sur la plateforme sous « {inscrite.name} ».
                  </p>
                )}
                <p className="mt-2 italic">
                  Ces informations viennent du fichier de la Fédération et sont réécrites à chaque
                  import : elles ne se modifient pas ici.
                </p>
              </div>

              <form action={formAction} className="space-y-3">
                <input type="hidden" name="numeroFase" value={ecole.numeroFase} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Email de direction
                    </label>
                    <input
                      name="emailDirection"
                      type="email"
                      defaultValue={ecole.emailDirection ?? ""}
                      className="input-field mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Email du pouvoir organisateur
                    </label>
                    <input
                      name="poEmail"
                      type="email"
                      defaultValue={ecole.poEmail ?? ""}
                      className="input-field mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Téléphone
                    </label>
                    <input name="phone" type="tel" defaultValue={ecole.phone ?? ""} className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Site web
                    </label>
                    <input name="website" defaultValue={ecole.website ?? ""} className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Statut
                    </label>
                    <select
                      name="prospectionStatus"
                      defaultValue={ecole.prospectionStatus}
                      className="input-field mt-1"
                    >
                      {PROSPECTION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                      Dernier contact
                    </label>
                    <input
                      name="lastContactedAt"
                      type="date"
                      defaultValue={ecole.lastContactedAt}
                      className="input-field mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Notes</label>
                  <textarea name="notes" rows={2} defaultValue={ecole.notes ?? ""} className="input-field mt-1" />
                </div>

                {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
                {state?.success && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">{state.success}</p>
                )}

                <button type="submit" disabled={pending} className="btn-primary">
                  {pending ? "Enregistrement…" : "Enregistrer le suivi"}
                </button>
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
