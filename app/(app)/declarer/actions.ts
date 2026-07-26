"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { createPeriodSchema } from "@/app/(app)/declarer/schema";

export type CreatePeriodState = { error?: string };

export async function createPeriod(
  _prevState: CreatePeriodState | undefined,
  formData: FormData
): Promise<CreatePeriodState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active pour ce compte." };

  const parsed = createPeriodSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    dureePeriodes: formData.get("dureePeriodes"),
    description: formData.get("description"),
    colleagueMembershipIds: formData.getAll("colleagueMembershipIds"),
  });
  if (!parsed.success) {
    return { error: "Formulaire invalide. Vérifiez les champs." };
  }

  // Ne fait confiance qu'aux memberships réellement actives de l'école active —
  // défense contre un formulaire trafiqué avec un membershipId d'une autre école.
  const colleagues = await prisma.membership.findMany({
    where: {
      id: { in: parsed.data.colleagueMembershipIds },
      schoolId: active.schoolId,
      status: "ACTIVE",
    },
  });

  const schoolYear = await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
  if (!schoolYear) return { error: "Aucune année scolaire configurée." };

  await prisma.collaborativePeriod.create({
    data: {
      type: parsed.data.type,
      date: new Date(parsed.data.date),
      dureePeriodes: parsed.data.dureePeriodes,
      description: parsed.data.description,
      schoolYearId: schoolYear.id,
      createdByUserId: session.userId,
      participants: {
        create: [
          {
            userId: session.userId,
            membershipId: active.membershipId,
            status: "CONFIRMED",
            isInitiator: true,
            confirmedAt: new Date(),
          },
          ...colleagues.map((m) => ({
            userId: m.userId,
            membershipId: m.id,
            status: "PENDING" as const,
          })),
        ],
      },
    },
  });

  redirect("/mes-periodes");
}
