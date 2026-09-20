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
        />
      </Reveal>
    </div>
  );
}
