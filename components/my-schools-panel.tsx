"use client";

import { useState } from "react";
import type { ActiveMembership } from "@/lib/active-school";
import { roleLabel } from "@/lib/role-labels";
import { LeaveSchoolDialog } from "@/components/leave-school-dialog";

/// Second emplacement du détachement, à côté de celui du menu d'école.
///
/// Le menu de la barre sert au geste rapide, sur l'école où l'on se trouve ;
/// cette liste sert à la vue d'ensemble — on y voit TOUTES ses écoles et le
/// rôle qu'on y tient, y compris celles qui ne sont pas actives. Qui enseigne
/// dans trois établissements n'a pas à basculer sur chacun pour en quitter un.
export function MySchoolsPanel({ memberships }: { memberships: ActiveMembership[] }) {
  const [quitter, setQuitter] = useState<ActiveMembership | null>(null);

  if (memberships.length === 0) return null;

  return (
    <>
      <ul className="card divide-y divide-stone-200 p-0 dark:divide-stone-800">
        {memberships.map((m) => (
          <li key={m.schoolId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                {m.schoolName}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                {roleLabel[m.role] ?? m.role}
              </p>
            </div>
            {m.isAccountOwner ? (
              <span className="text-xs text-stone-400 dark:text-stone-500">
                École créée par vous
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setQuitter(m)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Quitter
              </button>
            )}
          </li>
        ))}
      </ul>

      {quitter && (
        <LeaveSchoolDialog
          schoolId={quitter.schoolId}
          schoolName={quitter.schoolName}
          onClose={() => setQuitter(null)}
        />
      )}
    </>
  );
}
