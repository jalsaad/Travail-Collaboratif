"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveMembership } from "@/lib/active-school";
import { createPeriodSchema } from "@/app/(app)/declarer/schema";
import { periodesBetween } from "@/lib/period-duration";
import { notifyPendingParticipants } from "@/lib/participation-invitations";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { zipExternalParticipants } from "@/lib/external-participants";
import { invitePeerByEmail, zipColleagueInvites } from "@/lib/peer-referrals";
import { civilityAndLastName } from "@/lib/civility";
import { periodTypeLabel } from "@/lib/period-labels";

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

  // Ne fait confiance qu'aux memberships réellement actives de l'école active —
  // défense contre un formulaire trafiqué avec un membershipId d'une autre école.
  const colleagues = await prisma.membership.findMany({
    where: {
      id: { in: parsed.data.colleagueMembershipIds },
      schoolId: active.schoolId,
      status: "ACTIVE",
    },
  });

  const schoolYear = await getCurrentSchoolYear();
  if (!schoolYear) return { error: "Aucune année scolaire configurée." };

  const created = await prisma.collaborativePeriod.create({
    data: {
      type: parsed.data.type,
      date: new Date(parsed.data.date),
      heureDebut: parsed.data.heureDebut,
      heureFin: parsed.data.heureFin,
      dureePeriodes,
      natureActivite: parsed.data.natureActivite,
      description: parsed.data.description,
      objectifsPilotage: parsed.data.objectifsPilotage,
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
      // Aucun statut à confirmer ici : ces personnes n'ont pas de compte. Leur
      // présence documente la période sans peser sur la validation, qui reste
      // celle des seuls enseignants.
      externalParticipants: { create: parsed.data.externalParticipants },
    },
  });

  await notifyPendingParticipants(created.id);

  // Collègues encore sans compte, invités depuis la déclaration : chacun
  // reçoit un lien de parrainage rattaché à CETTE période, donc créer son
  // compte vaudra confirmation de sa participation. Après la création de la
  // période, forcément : le lien porte son identifiant.
  const invites = zipColleagueInvites(
    formData.getAll("inviteeName"),
    formData.getAll("inviteeEmail")
  );
  if (invites.length > 0) {
    const auteur = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, sex: true },
    });
    const periodPourEmail = {
      dateLabel: created.date.toLocaleDateString("fr-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      typeLabel: periodTypeLabel[created.type],
      description: created.description,
    };
    for (const invite of invites) {
      await invitePeerByEmail({
        to: invite.email,
        schoolId: active.schoolId,
        schoolName: active.schoolName,
        referredByMembershipId: active.membershipId,
        actorUserId: session.userId,
        inviterCivility: auteur ? civilityAndLastName(auteur) : "Un·e collègue",
        periodId: created.id,
        period: periodPourEmail,
        invitedName: invite.fullName,
      });
    }
  }

  redirect("/mes-periodes");
}
