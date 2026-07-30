"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/(auth)/login/actions";

const initialState: LoginState = {};

export function LoginForm({ espace }: { espace: "profs" | "direction" }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="espace" value={espace} />
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
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Mot de passe
          </label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-500"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-field mt-1.5"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600">
          {state.error}
          {state.switchTo && (
            <>
              {" "}
              <Link href={`/login/${state.switchTo}`} className="font-medium underline">
                Changer d&apos;espace
              </Link>
            </>
          )}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
