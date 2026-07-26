"use client";

import { useActionState } from "react";
import { updateMemberProfile, type MemberActionState } from "@/app/(app)/ecole/membres/actions";

const initialState: MemberActionState = {};

export function MemberProfileForm({
  membershipId,
  firstName,
  lastName,
  email,
  disabled,
}: {
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateMemberProfile, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <input type="hidden" name="membershipId" value={membershipId} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            defaultValue={firstName}
            disabled={disabled}
            required
            className="input-field mt-1.5 disabled:bg-stone-50 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            defaultValue={lastName}
            disabled={disabled}
            required
            className="input-field mt-1.5 disabled:bg-stone-50 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
          />
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
          disabled={disabled}
          required
          className="input-field mt-1.5 disabled:bg-stone-50 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      {!disabled && (
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
      )}
    </form>
  );
}
