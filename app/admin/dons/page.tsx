import { prisma } from "@/lib/prisma";
import { DonationsFlagPanel } from "@/components/donations-flag-panel";
import { Reveal } from "@/components/reveal";

export default async function AdminDonsPage() {
  const flag = await prisma.featureFlag.findUnique({ where: { key: "donations" } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Dons</h1>
      <Reveal>
        <DonationsFlagPanel enabled={flag?.enabled ?? false} />
      </Reveal>
    </div>
  );
}
