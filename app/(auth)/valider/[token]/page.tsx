import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashParticipationToken } from "@/lib/participation-token";
import { periodTypeLabel } from "@/lib/period-labels";
import { formatPeriodes, formatTimeRange } from "@/lib/period-duration";
import { collaborativeActivityLabel } from "@/lib/collaborative-activities";
import { civilityAndLastName } from "@/lib/civility";
import { ParticipationTokenActions } from "@/components/participation-token-actions";
import { LogoMark } from "@/components/logo-mark";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/70 via-stone-50 to-stone-50 px-4 py-10 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950">
      <div className="relative isolate w-full max-w-md">
        {/* Même halo que la page de réinitialisation de mot de passe. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-teal opacity-40 blur-2xl"
        />
        <Reveal className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={40} />
            <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-100">{title}</h1>
          </div>
          <div className="mt-7">{children}</div>
        </Reveal>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-20 shrink-0 text-xs text-stone-500 dark:text-stone-400">{label}</span>
      <span className="text-sm text-stone-900 dark:text-stone-100">{value}</span>
    </div>
  );
}

export default async function ValiderParticipationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;

  // Consultation seule : ouvrir cette page ne valide RIEN. C'est ce qui rend
  // le lien sûr malgré le préchargement des URLs par les filtres
  // anti-hameçonnage (cf. commentaire du modèle ParticipationToken).
  const token = await prisma.participationToken.findUnique({
    where: { tokenHash: hashParticipationToken(rawToken) },
    include: {
      periodParticipant: {
        include: {
          period: {
            include: { createdBy: { select: { firstName: true, lastName: true, sex: true } } },
          },
          membership: { include: { school: { select: { name: true } } } },
        },
      },
    },
  });

  if (!token) {
    return (
      <Shell title="Lien invalide">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Ce lien n&apos;est pas reconnu. Il a peut-être été remplacé par un envoi plus récent, la
          période ayant été modifiée entre-temps.
        </p>
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-500">
            Se connecter à la plateforme
          </Link>
        </p>
      </Shell>
    );
  }

  const { periodParticipant } = token;
  const { period } = periodParticipant;
  const expired = token.expiresAt < new Date();
  const alreadyAnswered = periodParticipant.status !== "PENDING";
  const nature = collaborativeActivityLabel(period.natureActivite);
  const horaire = formatTimeRange(period.heureDebut, period.heureFin);

  return (
    <Shell title="Valider ma participation">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        <strong className="text-stone-900 dark:text-stone-100">
          {civilityAndLastName(period.createdBy)}
        </strong>{" "}
        vous invite à valider votre participation à{" "}
        {formatPeriodes(period.dureePeriodes.toString())} période(s) de travail collaboratif.
      </p>

      <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/50">
        <Row label="École" value={periodParticipant.membership.school.name} />
        <Row
          label="Date"
          value={
            new Date(period.date).toLocaleDateString("fr-BE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }) + (horaire ? ` · ${horaire}` : "")
          }
        />
        <Row label="Type" value={periodTypeLabel[period.type] ?? period.type} />
        {nature && <Row label="Nature" value={nature} />}
        <Row label="Objet" value={period.description} />
      </div>

      <div className="mt-6">
        {token.usedAt || alreadyAnswered ? (
          <p className="rounded-lg bg-stone-100 px-3 py-2.5 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {periodParticipant.status === "CONFIRMED"
              ? "Vous avez déjà confirmé cette participation."
              : periodParticipant.status === "DECLINED"
                ? "Vous avez déjà décliné cette participation."
                : "Ce lien a déjà été utilisé."}
          </p>
        ) : expired ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Ce lien a expiré. Connectez-vous à la plateforme pour valider depuis « Mes périodes ».
          </p>
        ) : (
          <ParticipationTokenActions token={rawToken} />
        )}
      </div>

      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-500">
          Accéder à la plateforme
        </Link>
      </p>
    </Shell>
  );
}
