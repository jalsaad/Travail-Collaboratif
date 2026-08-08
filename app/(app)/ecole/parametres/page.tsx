import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { SchoolSettingsForm } from "@/components/school-settings-form";
import { JoinCodePanel } from "@/components/join-code-panel";
import { Reveal } from "@/components/reveal";

export default async function ParametresPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const active = await resolveActiveMembership(session.userId);
  if (!active) redirect("/mes-periodes");

  const [school, joinCode] = await Promise.all([
    prisma.school.findUniqueOrThrow({ where: { id: active.schoolId } }),
    prisma.joinCode.findFirst({ where: { schoolId: active.schoolId, active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Paramètres — {active.schoolName}
      </h1>

      <Reveal>
        <SchoolSettingsForm
          name={school.name}
          reseau={school.reseau ?? ""}
          region={school.region ?? ""}
          niveaux={school.niveaux}
          typesEnseignement={school.typesEnseignement}
          address={school.address ?? ""}
          postalCode={school.postalCode ?? ""}
          locality={school.locality ?? ""}
          country={school.country ?? ""}
          phone={school.phone ?? ""}
          logoUrl={school.logoUrl ?? ""}
          numeroFase={school.numeroFase ?? ""}
        />
      </Reveal>

      <Reveal delay={80}>
        <JoinCodePanel code={joinCode?.code ?? null} />
      </Reveal>
    </div>
  );
}
