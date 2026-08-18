"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { createPeriodSchema } from "@/app/(app)/declarer/schema";
import { periodesBetween } from "@/lib/period-duration";
import { notifyPendingParticipants } from "@/lib/participation-invitations";
import { zipExternalParticipants } from "@/lib/external-participants";

// Invariant d'autorisation (cf. permissions.md > assertCanConfirmParticipation) :
// le where est TOUJOURS construit à partir de session.userId, jamais d'un
// identifiant fourni par le client — impossible d'agir sur la ligne d'un tiers.

export async function confirmParticipation(periodId: string) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  await prisma.periodParticipant.update({
    where: { periodId_userId: { periodId, userId: session.userId } },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });

  revalidatePath("/mes-periodes");
}

export async function declineParticipation(periodId: string) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  await prisma.periodParticipant.update({
    where: { periodId_userId: { periodId, userId: session.userId } },
    data: { status: "DECLINED" },
  });

  revalidatePath("/mes-periodes");
}

// Seul·e l'initiateur·rice (createdByUserId, re-vérifié frais en base — jamais
// une valeur transmise par le client) peut modifier ou supprimer sa propre
// période déclarée, à l'image du principe "chacun gère ses propres données"
// déjà appliqué au profil (lib/school-authorization.ts).
async function assertCanEditPeriod(userId: string, periodId: string) {
  const period = await prisma.collaborativePeriod.findUnique({ where: { id: periodId } });
  if (!period || period.createdByUserId !== userId) {
    throw new Error("Seul·e l'initiateur·rice de cette période peut la modifier ou la supprimer.");
  }
  return period;
}

export type UpdatePeriodState = { error?: string };

export async function updatePeriod(
  periodId: string,
  _prevState: UpdatePeriodState | undefined,
  formData: FormData
): Promise<UpdatePeriodState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  await assertCanEditPeriod(session.userId, periodId);

  const active = await resolveActiveMembership(session.userId);
  if (!active) return { error: "Aucune école active pour ce compte." };

  const parsed = createPeriodSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    heureDebut: formData.get("heureDebut"),
    heureFin: formData.get("heureFin"),
    natureActivite: formData.get("natureActivite") ?? "",
    description: formData.get("description"),
    objectifsPilotage: formData.get("objectifsPilotage") ?? "",
    colleagueMembershipIds: formData.getAll("colleagueMembershipIds"),
    externalParticipants: zipExternalParticipants(
      formData.getAll("externalName"),
      formData.getAll("externalStatus")
    ),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide. Vérifiez les champs." };
  }

  // Non-null garanti par le refine du schéma.
  const dureePeriodes = periodesBetween(parsed.data.heureDebut, parsed.data.heureFin)!;

  // Même défense que createPeriod : ne fait confiance qu'aux memberships
  // réellement actives de l'école active, pas au formulaire.
  const colleagues = await prisma.membership.findMany({
    where: {
      id: { in: parsed.data.colleagueMembershipIds },
      schoolId: active.schoolId,
      status: "ACTIVE",
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.collaborativePeriod.update({
      where: { id: periodId },
      data: {
        type: parsed.data.type,
        date: new Date(parsed.data.date),
        heureDebut: parsed.data.heureDebut,
        heureFin: parsed.data.heureFin,
        dureePeriodes,
        natureActivite: parsed.data.natureActivite,
        description: parsed.data.description,
        objectifsPilotage: parsed.data.objectifsPilotage,
      },
    });

    // Réécrites en bloc plutôt que rapprochées une à une : ces lignes n'ont
    // ni identité stable ni statut à préserver, la liste soumise fait foi.
    await tx.externalParticipant.deleteMany({ where: { periodId } });
    if (parsed.data.externalParticipants.length > 0) {
      await tx.externalParticipant.createMany({
        data: parsed.data.externalParticipants.map((e) => ({ ...e, periodId })),
      });
    }

    // Toute réédition doit être revalidée par TOUS les intervenants, y
    // compris l'initiateur·rice — on repart donc de zéro sur les statuts.
    await tx.periodParticipant.updateMany({
      where: { periodId },
      data: { status: "PENDING", confirmedAt: null },
    });

    // Retire les collègues qui ne sont plus sélectionnés (jamais la propre
    // ligne de l'initiateur·rice, toujours conservée).
    await tx.periodParticipant.deleteMany({
      where: {
        periodId,
        membershipId: { notIn: [active.membershipId, ...colleagues.map((c) => c.id)] },
      },
    });

    const existing = await tx.periodParticipant.findMany({
      where: { periodId },
      select: { membershipId: true },
    });
    const existingIds = new Set(existing.map((e) => e.membershipId));
    const toAdd = colleagues.filter((c) => !existingIds.has(c.id));
    if (toAdd.length > 0) {
      await tx.periodParticipant.createMany({
        data: toAdd.map((c) => ({
          periodId,
          userId: c.userId,
          membershipId: c.id,
          status: "PENDING" as const,
        })),
      });
    }
  });

  // Après réédition, TOUS les intervenants sont repassés en attente : ils
  // doivent être prévenus, sans quoi la période resterait bloquée.
  await notifyPendingParticipants(periodId);

  revalidatePath("/mes-periodes");
  redirect("/mes-periodes");
}

export async function deletePeriod(periodId: string) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  await assertCanEditPeriod(session.userId, periodId);

  await prisma.collaborativePeriod.delete({ where: { id: periodId } });

  revalidatePath("/mes-periodes");
}
