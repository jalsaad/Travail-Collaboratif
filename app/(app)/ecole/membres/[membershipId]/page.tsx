import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { MemberProfileForm } from "@/components/member-profile-form";
import { MemberRowActions } from "@/components/member-row-actions";
import { Reveal } from "@/components/reveal";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const member = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId: active.schoolId, status: "ACTIVE" },
    include: { user: true },
  });
  if (!member) notFound();

  // Indice d'affichage seulement — la vraie barrière est assertCanEditMemberProfile
  // côté serveur, re-vérifiée à chaque soumission indépendamment de ce booléen.
  const disabled = member.isAccountOwner && member.userId !== session.userId;
  const canManageRoleOrRemove = member.role !== "DIRECTION" && !member.isAccountOwner;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {member.user.firstName} {member.user.lastName}
      </h1>

      <Reveal>
        <MemberProfileForm
          membershipId={member.id}
          firstName={member.user.firstName}
          lastName={member.user.lastName}
          email={member.user.email}
          disabled={disabled}
        />
      </Reveal>

      {canManageRoleOrRemove && (
        <Reveal delay={80} className="card p-6">
          <h2 className="mb-3 text-sm font-medium text-stone-700 dark:text-stone-300">Rôle et rattachement</h2>
          <MemberRowActions membershipId={member.id} role={member.role} />
        </Reveal>
      )}
    </div>
  );
}
