import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OwnProfileForm } from "@/components/own-profile-form";
import { Reveal } from "@/components/reveal";

export default async function MonProfilPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Mes données personnelles</h1>
      <Reveal>
        <OwnProfileForm firstName={user.firstName} lastName={user.lastName} email={user.email} />
      </Reveal>
    </div>
  );
}
