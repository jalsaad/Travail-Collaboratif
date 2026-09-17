import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LogoHomeLink } from "@/components/logo-home-link";
import { verifyNewMemberUnsubscribe } from "@/lib/notification-unsubscribe";
import { confirmUnsubscribe } from "./actions";

export const metadata: Metadata = {
  title: "Notifications — Travail Collaboratif",
  robots: { index: false, follow: false },
};

// Page ouverte par le lien « Ne plus recevoir ces emails » de la notification
// de nouvelle inscription. Accessible sans connexion — c'est tout l'intérêt
// d'un lien en bas d'email — mais n'agit qu'après un clic de confirmation :
// l'ouvrir seule ne modifie rien (cf. lib/notification-unsubscribe.ts).
export default async function DesabonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; s?: string }>;
}) {
  const { m, s } = await searchParams;
  const membershipId = verifyNewMemberUnsubscribe(m, s);
  const membership = membershipId
    ? await prisma.membership.findUnique({
        where: { id: membershipId },
        select: { notifyNewMembers: true, school: { select: { name: true } } },
      })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/70 via-stone-50 to-stone-50 px-4 py-10 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <div className="flex justify-center">
          <LogoHomeLink />
        </div>

        {!membership ? (
          <>
            <h1 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Lien invalide</h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Ce lien est incomplet ou ne correspond plus à aucun rattachement. Vous pouvez gérer vos
              notifications depuis les paramètres de votre espace direction.
            </p>
          </>
        ) : membership.notifyNewMembers ? (
          <>
            <h1 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Ne plus recevoir ces emails ?
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Vous ne serez plus prévenu·e par email des nouvelles inscriptions à{" "}
              <strong className="text-stone-700 dark:text-stone-300">{membership.school.name}</strong>.
              Les autres membres de la direction gardent leur propre réglage.
            </p>
            <form action={confirmUnsubscribe} className="mt-6">
              <input type="hidden" name="m" value={m} />
              <input type="hidden" name="s" value={s} />
              <button type="submit" className="btn-primary w-full">
                Confirmer le désabonnement
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">C&apos;est fait</h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Vous ne recevrez plus d&apos;email lors des nouvelles inscriptions à{" "}
              <strong className="text-stone-700 dark:text-stone-300">{membership.school.name}</strong>. Elles
              restent visibles dans la liste des membres de votre espace direction.
            </p>
            <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
              Vous pouvez réactiver ces emails à tout moment dans{" "}
              <Link href="/ecole/parametres" className="text-brand-700 hover:underline dark:text-brand-400">
                Paramètres
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
