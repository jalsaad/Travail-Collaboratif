import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JoinForm } from "@/components/join-form";
import { LogoMark } from "@/components/logo-mark";
import { Reveal } from "@/components/reveal";

export default async function RejoindrePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const disciplines = await prisma.discipline.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/70 via-stone-50 to-stone-50 px-4 py-10 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950">
      <div className="relative isolate w-full max-w-sm">
        {/* Halo aux couleurs du logo (bleu → sarcelle) qui déborde autour du
            cadre, comme une source lumineuse cachée derrière celui-ci — cf.
            components/login-espace-card.tsx pour le même effet. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl"
        />
        <Reveal className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={40} />
            <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-100">Rejoindre votre école</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Utilisez le code de rattachement transmis par votre référent numérique ou votre direction.
            </p>
          </div>
          <div className="mt-7">
            <JoinForm defaultCode={code ?? ""} disciplines={disciplines.map((d) => d.name)} />
          </div>
          <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-500">
              Se connecter
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">
            Pas de code ? Votre école n&apos;est peut-être pas encore inscrite, consultez votre
            direction !
          </p>
        </Reveal>
      </div>
    </div>
  );
}
