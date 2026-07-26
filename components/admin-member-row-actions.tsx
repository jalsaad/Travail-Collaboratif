"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { changeMemberRoleAsAdmin, removeMemberAsAdmin } from "@/app/admin/ecoles/[schoolId]/actions";
import { roleLabel } from "@/lib/role-labels";

export function AdminMemberRowActions({
  membershipId,
  role,
  isAccountOwner,
}: {
  membershipId: string;
  role: Role;
  isAccountOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeRole(newRole: Role) {
    if (newRole === role) return;
    setError(null);
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    formData.set("role", newRole);
    startTransition(async () => {
      const result = await changeMemberRoleAsAdmin(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  function remove() {
    const warning = isAccountOwner
      ? "Ce membre est le titulaire du compte de cette école. Le retirer quand même ?"
      : "Retirer ce membre de l'école ?";
    if (!window.confirm(warning)) return;
    setError(null);
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    startTransition(async () => {
      const result = await removeMemberAsAdmin(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <select
          value={role}
          disabled={pending}
          onChange={(e) => changeRole(e.target.value as Role)}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          <option value="DIRECTION">{roleLabel.DIRECTION}</option>
          <option value="REFERENT_NUMERIQUE">{roleLabel.REFERENT_NUMERIQUE}</option>
          <option value="ENSEIGNANT">{roleLabel.ENSEIGNANT}</option>
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
        >
          Supprimer
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
