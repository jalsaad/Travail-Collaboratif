"use client";

import { useTransition } from "react";
import type { ActiveMembership } from "@/lib/active-school";
import { switchSchool } from "@/app/(app)/actions";
import { roleLabel } from "@/lib/role-labels";

export function SchoolSwitcher({
  memberships,
  activeSchoolId,
}: {
  memberships: ActiveMembership[];
  activeSchoolId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={activeSchoolId}
      disabled={pending}
      onChange={(event) => {
        const schoolId = event.target.value;
        startTransition(() => {
          switchSchool(schoolId);
        });
      }}
      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-700 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
    >
      {memberships.map((m) => (
        <option key={m.schoolId} value={m.schoolId}>
          {m.schoolName} — {roleLabel[m.role] ?? m.role}
        </option>
      ))}
    </select>
  );
}
