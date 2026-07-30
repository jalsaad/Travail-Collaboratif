"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/(auth)/mot-de-passe-oublie/actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state?.success) {
    return <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-field mt-1.5"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Envoi..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
