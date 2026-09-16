import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashPeerReferralToken } from "@/lib/peer-referral";
import { civilityAndLastName } from "@/lib/civility";
import { PeerReferralJoinForm } from "@/components/peer-referral-join-form";
import { LogoHomeLink } from "@/components/logo-home-link";
import { Reveal } from "@/components/reveal";
import { APP_TIME_ZONE } from "@/lib/time-zone";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/70 via-stone-50 to-stone-50 px-4 py-10 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950">
      <div className="relative isolate w-full max-w-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl"
        />
        <Reveal className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          {children}
        </Reveal>
      </div>
    </div>
  );
}

export default async function RejoindreParParrainagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Consultation seule : ouvrir ce lien ne crée ni ne valide rien tant que le
  // formulaire n'est pas soumis — même invariant que /valider/[token].
  const referral = await prisma.peerReferral.findUnique({
    where: { tokenHash: hashPeerReferralToken(token) },
    include: {
      school: { select: { name: true } },
      referredByMembership: {
        include: { user: { select: { firstName: true, lastName: true, sex: true } } },
      },
      period: { select: { date: true } },
    },
  });

  if (!referral) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <LogoHomeLink />
          <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-100">Lien invalide</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Ce lien de parrainage n&apos;est pas reconnu. Demandez-en un nouveau à la personne qui vous
            l&apos;a transmis.
          </p>
        </div>
      </Shell>
    );
  }

  const expired = referral.expiresAt < new Date();
  const used = referral.usedAt !== null;

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <LogoHomeLink />
        <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-100">
          Rejoindre {referral.school.name}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {civilityAndLastName(referral.referredByMembership.user)} vous invite à rejoindre l&apos;espace
          de {referral.school.name} sur Travail Collaboratif
          {referral.period &&
            `, et à valider votre participation à la période du ${referral.period.date.toLocaleDateString("fr-BE", { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" })}`}
          .
        </p>
      </div>

      <div className="mt-7">
        {used ? (
          <p className="rounded-lg bg-stone-100 px-3 py-2.5 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            Ce lien de parrainage a déjà été utilisé.
          </p>
        ) : expired ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Ce lien de parrainage a expiré. Demandez-en un nouveau à la personne qui vous l&apos;a
            transmis.
          </p>
        ) : (
          <PeerReferralJoinForm token={token} />
        )}
      </div>

      <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
        Déjà un compte ?{" "}
        <Link href="/login/profs" className="font-medium text-brand-700 hover:underline dark:text-brand-500">
          Se connecter
        </Link>
      </p>
    </Shell>
  );
}
