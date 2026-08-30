import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { DeclarePeriodForm } from "@/components/declare-period-form";
import { NoActiveSchoolNotice } from "@/components/no-active-school-notice";
import { Reveal } from "@/components/reveal";

export default async function DeclarerPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return <NoActiveSchoolNotice />;

  const colleagues = await prisma.membership.findMany({
    where: {
      schoolId: active.schoolId,
      status: "ACTIVE",
      userId: { not: session.userId },
    },
    include: { user: true },
    orderBy: [{ user: { lastName: "asc" } }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Déclarer une période — {active.schoolName}
      </h1>
      <Reveal>
        <DeclarePeriodForm
          colleagues={colleagues.map((m) => ({
            membershipId: m.id,
            name: `${m.user.firstName} ${m.user.lastName}`,
          }))}
          // Cercle initié par un·e enseignant·e, pas encore inscrit
          // officiellement : personne n'y a de code de rattachement à
          // distribuer, et le sélecteur ci-dessus est vide tant qu'aucun·e
          // collègue n'a créé son compte. L'invitation par email est alors le
          // seul moyen d'associer quelqu'un à la période.
          peutInviter={active.schoolStatus === "PARTIAL"}
        />
      </Reveal>
    </div>
  );
}
