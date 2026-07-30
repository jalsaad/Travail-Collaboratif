import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { LogoMark } from "@/components/logo-mark";
import { Reveal } from "@/components/reveal";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/70 via-stone-50 to-stone-50 px-4 py-10 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950">
      <div className="relative isolate w-full max-w-sm">
        {/* Halo aux couleurs du logo — cf. components/login-espace-card.tsx
            pour le même effet. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl"
        />
        <Reveal className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={40} />
            <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-100">
              Nouveau mot de passe
            </h1>
          </div>
          <div className="mt-7">
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <p className="text-sm text-red-600">Lien invalide : aucun jeton fourni.</p>
            )}
          </div>
          <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
            <Link
              href="/mot-de-passe-oublie"
              className="font-medium text-brand-700 hover:underline dark:text-brand-500"
            >
              Demander un nouveau lien
            </Link>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
