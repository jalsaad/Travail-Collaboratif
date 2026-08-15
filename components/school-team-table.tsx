"use client";

import { useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { roleLabel } from "@/lib/role-labels";
import { formatPeriodes } from "@/lib/period-duration";
import { CircularProgressRing } from "@/components/circular-progress-ring";
import { MemberRowActions } from "@/components/member-row-actions";

const roleBadgeStyle: Record<Role, string> = {
  DIRECTION: "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900",
  REFERENT_NUMERIQUE: "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  ENSEIGNANT: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

/// Une ligne = une personne de l'école. L'avancement n'existe que pour les
/// enseignant·es : eux seuls ont un quota de périodes (cf. quota-engine).
export type TeamMember = {
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isAccountOwner: boolean;
  etp: string | null;
  progress: { percent: number; done: number; objective: number; otherSchools: number } | null;
};

// La fusion porte le tableau à huit colonnes : sans « nowrap », les noms et
// les boutons d'action se replient sur deux lignes au lieu de laisser la carte
// défiler horizontalement.
const CELL = "px-3 py-3 whitespace-nowrap";
const HEAD = "px-3 py-3 whitespace-nowrap";

/// Recherche insensible à la casse et aux accents : taper « lefevre » doit
/// trouver « Lefèvre », personne ne compose les diacritiques dans un champ de
/// filtre.
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SchoolTeamTable({ members }: { members: TeamMember[] }) {
  const [recherche, setRecherche] = useState("");

  const terme = normalise(recherche.trim());
  // Filtrage en mémoire plutôt que par requête : une école compte quelques
  // dizaines de personnes, un aller-retour serveur à chaque frappe serait
  // plus lent que le rendu.
  const visibles = terme
    ? members.filter((m) =>
        normalise(`${m.firstName} ${m.lastName} ${m.email}`).includes(terme)
      )
    : members;

  // Les colonnes inter-écoles n'apparaissent que si elles ont matière à
  // s'afficher : dans une école où personne n'enseigne ailleurs, deux colonnes
  // vides n'apporteraient rien. Calculé sur TOUS les membres, pas sur les
  // seuls visibles, pour que les colonnes ne sautent pas pendant la frappe.
  const hasMultiSchool = members.some((m) => (m.progress?.otherSchools ?? 0) > 0);

  return (
    <>
      <div className="mb-3">
        <label htmlFor="recherche-membre" className="sr-only">
          Rechercher un membre
        </label>
        <input
          id="recherche-membre"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un membre (nom, prénom ou email)"
          className="input-field"
        />
        {terme && (
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            {visibles.length} résultat{visibles.length > 1 ? "s" : ""} sur {members.length}
          </p>
        )}
      </div>

      <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/70 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-500">
            <th className={HEAD}>Nom</th>
            <th className={HEAD}>Rôle</th>
            <th className={HEAD}>ETP</th>
            <th className={HEAD}>Taux</th>
            {/* « 19 / 30 » plutôt que deux colonnes : l'effectué ne se lit
                jamais sans son objectif. */}
            <th className={HEAD}>Périodes</th>
            {hasMultiSchool && <th className={HEAD}>Ailleurs</th>}
            {hasMultiSchool && <th className={HEAD}>Total</th>}
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((member) => {
            const canManage = member.role !== "DIRECTION" && !member.isAccountOwner;
            const progress = member.progress;
            return (
              <tr
                key={member.membershipId}
                className="border-b border-stone-50 transition last:border-0 hover:bg-stone-50/60 dark:border-stone-800 dark:hover:bg-stone-800/60"
              >
                <td className={CELL}>
                  <Link
                    href={`/ecole/membres/${member.membershipId}`}
                    className="font-medium text-stone-900 hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-500"
                  >
                    {member.firstName} {member.lastName}
                  </Link>
                  {member.isAccountOwner && (
                    <span className="ml-2 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                      titulaire
                    </span>
                  )}
                  <p className="max-w-[13rem] truncate text-xs text-stone-400 dark:text-stone-500" title={member.email}>
                    {member.email}
                  </p>
                </td>
                <td className={CELL}>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeStyle[member.role]}`}>
                    {roleLabel[member.role]}
                  </span>
                </td>
                <td className={`${CELL} text-stone-600 dark:text-stone-400`}>{member.etp ?? "—"}</td>
                <td className={CELL}>
                  {progress ? (
                    <CircularProgressRing percent={progress.percent} size={48} strokeWidth={5} />
                  ) : (
                    <span className="text-stone-400 dark:text-stone-500">—</span>
                  )}
                </td>
                <td className={`${CELL} text-stone-600 dark:text-stone-400`}>
                  {progress ? (
                    <>
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {formatPeriodes(progress.done)}
                      </span>
                      <span className="text-stone-400 dark:text-stone-500">
                        {" / "}
                        {formatPeriodes(progress.objective)}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                {hasMultiSchool && (
                  <td className={`${CELL} text-stone-500 dark:text-stone-400`}>
                    {progress && progress.otherSchools > 0 ? formatPeriodes(progress.otherSchools) : "—"}
                  </td>
                )}
                {hasMultiSchool && (
                  <td className={`${CELL} font-medium text-stone-800 dark:text-stone-200`}>
                    {progress ? formatPeriodes(progress.done + progress.otherSchools) : "—"}
                  </td>
                )}
                {/* Seule colonne autorisée à se replier : les deux boutons
                    tiennent sur deux lignes plutôt que d'imposer un
                    défilement horizontal à tout le tableau. */}
                <td className="px-3 py-3 text-right">
                  {canManage && <MemberRowActions membershipId={member.membershipId} role={member.role} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visibles.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
          Aucun membre ne correspond à « {recherche.trim()} ».
        </p>
      )}
      </div>
    </>
  );
}
