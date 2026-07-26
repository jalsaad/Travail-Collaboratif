"use client";

import { useActionState } from "react";
import { joinSchoolWithCode, type JoinSchoolState } from "@/app/(app)/rejoindre-ecole/actions";

const initialState: JoinSchoolState = {};

export function JoinSchoolForm() {
  const [state, formAction, pending] = useActionState(joinSchoolWithCode, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Code de rattachement
        </label>
        <input
          id="code"
          name="code"
          required
          placeholder="ex: TILL-2026-8K3"
          className="input-field mt-1.5 uppercase"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Rattachement..." : "Rejoindre cette école"}
      </button>
    </form>
  );
}
