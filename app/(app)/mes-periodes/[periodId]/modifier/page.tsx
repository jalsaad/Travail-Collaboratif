import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { EditPeriodForm } from "@/components/edit-period-form";
import { Reveal } from "@/components/reveal";

export default async function ModifierPeriodePage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const period = await prisma.collaborativePeriod.findUnique({
    where: { id: periodId },
    include: { participants: true },
  });
  // Seul·e l'initiateur·rice peut accéder à l'édition — même garde que
  // l'action serveur updatePeriod (défense en profondeur).
  if (!period || period.createdByUserId !== session.userId) notFound();

  const colleagues = await prisma.membership.findMany({
    where: {
      schoolId: active.schoolId,
      status: "ACTIVE",
      userId: { not: session.userId },
    },
    include: { user: true },
    orderBy: [{ user: { lastName: "asc" } }],
  });

  const selectedMembershipIds = period.participants
    .filter((p) => p.userId !== session.userId)
    .map((p) => p.membershipId);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Modifier la période — {active.schoolName}
      </h1>
      <Reveal>
        <EditPeriodForm
          periodId={period.id}
          type={period.type}
          date={period.date.toISOString().slice(0, 10)}
          heureDebut={period.heureDebut ?? ""}
          heureFin={period.heureFin ?? ""}
          natureActivite={period.natureActivite ?? ""}
          objectifsPilotage={period.objectifsPilotage ?? ""}
          description={period.description}
          colleagues={colleagues.map((m) => ({
            membershipId: m.id,
            name: `${m.user.firstName} ${m.user.lastName}`,
          }))}
          selectedMembershipIds={selectedMembershipIds}
        />
      </Reveal>
    </div>
  );
}
