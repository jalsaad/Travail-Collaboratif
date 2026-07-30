"use client";

import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "@/app/(auth)/reinitialiser-mot-de-passe/actions";
import { PasswordInput } from "@/components/password-input";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Nouveau mot de passe
        </label>
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
      </div>

      <div>
        <label
          htmlFor="passwordConfirmation"
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Confirmer le mot de passe
        </label>
        <PasswordInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500">8 caractères minimum.</p>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Enregistrement..." : "Réinitialiser le mot de passe"}
      </button>
    </form>
  );
}
