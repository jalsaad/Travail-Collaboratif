import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { getMembershipProgress, getOtherSchoolsPeriodes } from "@/lib/collaboration-progress";
import { formatPeriodes } from "@/lib/period-duration";
import { CircularProgressRing } from "@/components/circular-progress-ring";
import { PeriodCard } from "@/components/period-card";
import { VoirPlusPeriodes } from "@/components/voir-plus-periodes";
import { decouperPeriodes, limitePeriodes } from "@/lib/period-pagination";
import { NoActiveSchoolNotice } from "@/components/no-active-school-notice";
import { ExportPanel } from "@/components/export-panel";
import { Reveal } from "@/components/reveal";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export default async function MesPeriodesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodes?: string }>;
}) {
  const limite = limitePeriodes((await searchParams).periodes);
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return <NoActiveSchoolNotice />;

  const schoolYear = await getCurrentSchoolYear();
  const progress = schoolYear ? await getMembershipProgress(active.membershipId, schoolYear.id) : null;
  // Périodes déclarées dans les autres écoles de la personne, s'il y en a :
  // son obligation annuelle porte sur le total, pas sur une seule école.
  const ailleurs = schoolYear
    ? await getOtherSchoolsPeriodes(session.userId, active.membershipId, schoolYear.id)
    : 0;

  // Scopé sur l'année courante, comme l'espace Direction (cf. ecole/page.tsx) :
  // c'est ce qui fait repartir l'écran de zéro après l'archivage de fin
  // d'année (cf. lib/school-year-archive.ts), les périodes clôturées restant
  // en base et dans l'archive disque.
  const periodsPage = schoolYear
    ? await prisma.collaborativePeriod.findMany({
        where: {
          schoolYearId: schoolYear.id,
          participants: { some: { membershipId: active.membershipId } },
        },
        include: {
          participants: {
            include: { user: true, membership: { include: { school: true } } },
          },
          externalParticipants: true,
          // Invitations encore ouvertes : des collègues nommés à la
          // déclaration qui n'ont pas de participation, faute de compte à ce
          // moment-là. Sans elles, la carte affichait « validée » une période
          // à laquelle il manquait quelqu'un (cf. lib/period-status.ts).
          // `select` et non l'objet entier : le hash du jeton n'a rien à
          // faire dans les données de rendu, même côté serveur.
          peerReferrals: {
            where: { usedAt: null },
            select: { id: true, invitedName: true, invitedEmail: true, expiresAt: true },
          },
        },
        orderBy: { date: "desc" },
        // +1 : détecte une suite sans payer un comptage (cf.
        // lib/period-pagination.ts). L'anneau de progression, lui, vient
        // d'agrégats séparés — il reste juste malgré la liste bornée.
        take: limite + 1,
      })
    : [];

  const { visibles: periods, resteAVoir, limiteSuivante } = decouperPeriodes(periodsPage, limite);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Mes périodes — {active.schoolName}
      </h1>

      {progress && (
        <Reveal className="card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-center sm:gap-6">
          <CircularProgressRing percent={progress.percent} size={120} strokeWidth={9} />
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {formatPeriodes(progress.done)} / {formatPeriodes(progress.objective)} périodes effectuées
            {schoolYear && (
              <span className="block text-xs text-stone-400 dark:text-stone-500">
                pour l&apos;année scolaire {schoolYear.label}
              </span>
            )}
            {ailleurs > 0 && (
              <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
                dont {formatPeriodes(ailleurs)} période(s) dans un autre établissement —{" "}
                <span className="font-semibold text-stone-700 dark:text-stone-200">
                  {formatPeriodes(progress.done + ailleurs)} au total
                </span>
              </span>
            )}
          </p>
        </Reveal>
      )}

      <ExportPanel action="/api/export/mine" />

      {periods.length === 0 && (
        <div className="card p-6 text-sm text-stone-500 dark:text-stone-400">
          Aucune période déclarée pour cette école pour le moment.
        </div>
      )}

      <div className="space-y-3">
        {periods.map((period, index) => (
          <PeriodCard key={period.id} period={period} currentUserId={session.userId} index={index} />
        ))}
        {resteAVoir && (
          <VoirPlusPeriodes limiteSuivante={limiteSuivante} affichees={periods.length} />
        )}
      </div>

      {/* Les périodes déclarées AVANT la création du compte sont désormais
          rattachées automatiquement (cf. lib/peer-referral-reconcile.ts), mais
          rien ne peut l'être pour les invitations émises avant que la
          plateforme ne conserve l'adresse de destination : celles-là n'ont
          laissé aucune trace exploitable. Cette note donne la marche à suivre
          plutôt que de laisser ouvrir un ticket — c'est par un ticket que le
          défaut a été découvert. */}
      <details className="card p-5 text-sm text-stone-600 dark:text-stone-400">
        <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
          Une période déclarée par un collègue n&apos;apparaît pas ici ?
        </summary>
        <p className="mt-3">
          Cela arrive pour les activités déclarées avant la création de votre compte. Demandez à la
          personne qui l&apos;a déclarée d&apos;ouvrir sa période dans « Mes périodes », de cliquer sur{" "}
          <span className="font-semibold">Modifier</span>, puis de vous cocher dans la liste des
          collègues de l&apos;école — vous y figurez depuis que votre compte existe. Vous recevrez
          alors l&apos;invitation à valider, et la période comptera dans votre total annuel.
        </p>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-500">
          À savoir : cette modification remet les autres participants en attente de validation, ils
          devront revalider.
        </p>
      </details>
    </div>
  );
}
