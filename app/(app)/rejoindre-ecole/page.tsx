import { prisma } from "@/lib/prisma";
import { JoinSchoolForm } from "@/components/join-school-form";
import { Reveal } from "@/components/reveal";

export default async function RejoindreEcolePage() {
  const disciplines = await prisma.discipline.findMany({ orderBy: { name: "asc" } });

  return (
    <Reveal className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Rejoindre une autre école</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Ajoutez un rattachement à une nouvelle école grâce à son code de rattachement.
      </p>
      <JoinSchoolForm disciplines={disciplines.map((d) => d.name)} />
    </Reveal>
  );
}
