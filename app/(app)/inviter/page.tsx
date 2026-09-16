import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { periodTypeLabel } from "@/lib/period-labels";
import { NoActiveSchoolNotice } from "@/components/no-active-school-notice";
import { PeerReferralForm } from "@/components/peer-referral-form";
import { Reveal } from "@/components/reveal";
import { APP_TIME_ZONE } from "@/lib/time-zone";

export default async function InviterPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return <NoActiveSchoolNotice />;

  // Périodes où l'auteur de la demande est réellement partie prenante à
  // l'école active — seules celles-là peuvent servir de contexte à un
  // parrainage (cf. app/(app)/inviter/actions.ts, qui revérifie ce lien).
  const participations = await prisma.periodParticipant.findMany({
    where: { userId: session.userId, membershipId: active.membershipId },
    include: { period: { select: { id: true, date: true, type: true, description: true } } },
    orderBy: { period: { date: "desc" } },
    take: 20,
  });

  const periods = participations.map((p) => ({
    id: p.period.id,
    label: `${p.period.date.toLocaleDateString("fr-BE", { timeZone: APP_TIME_ZONE, day: "numeric", month: "short", year: "numeric" })} — ${periodTypeLabel[p.period.type]} — ${p.period.description}`,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Inviter un·e collègue
      </h1>
      <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-400">
        Un·e collègue sans compte n&apos;a pas besoin d&apos;un code de rattachement demandé à
        l&apos;administration : générez-lui un lien ou un QR code personnel. En l&apos;ouvrant, il ou elle
        crée son compte directement rattaché à {active.schoolName} — et, si vous liez le lien à une
        période précise, valide du même geste sa participation à celle-ci.
      </p>
      <Reveal>
        <PeerReferralForm periods={periods} />
      </Reveal>
    </div>
  );
}
