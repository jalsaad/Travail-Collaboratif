"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { updateMemberRole, removeMember } from "@/app/(app)/ecole/membres/actions";

export function MemberRowActions({ membershipId, role }: { membershipId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeRole(newRole: "ENSEIGNANT" | "REFERENT_NUMERIQUE") {
    setError(null);
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    formData.set("role", newRole);
    startTransition(async () => {
      const result = await updateMemberRole(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  function remove() {
    if (!window.confirm("Retirer ce membre de l'école ?")) return;
    setError(null);
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    startTransition(async () => {
      const result = await removeMember(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {role === "ENSEIGNANT" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => changeRole("REFERENT_NUMERIQUE")}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-60 dark:text-brand-400 dark:hover:bg-stone-800"
          >
            Promouvoir référent
          </button>
        )}
        {role === "REFERENT_NUMERIQUE" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => changeRole("ENSEIGNANT")}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-60 dark:text-brand-400 dark:hover:bg-stone-800"
          >
            Rétrograder enseignant
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
        >
          Retirer
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
