"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveSchoolCookie } from "@/lib/active-school";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import { notifySchoolDirectionOfNewMember } from "@/lib/school-notifications";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { teacherIdentitySchema, createTeacherAccountAndMembership } from "@/lib/teacher-signup";
import { hashPeerReferralToken } from "@/lib/peer-referral";
import {
  hasAcceptedPrivacyPolicy,
  privacyAcceptanceRecord,
  PRIVACY_REFUSED_MESSAGE,
} from "@/lib/privacy-policy";
import {
  reconcilePeerReferralsForMember,
} from "@/lib/peer-referral-reconcile";
import { horsDemo, demoErrorState } from "@/lib/demo-mode";

export type PeerReferralJoinState = { error?: string };

const joinSchema = teacherIdentitySchema.and(z.object({ token: z.string().min(1, "Lien invalide.") }));

async function joinViaPeerReferralImpl(
  _prevState: PeerReferralJoinState | undefined,
  formData: FormData
): Promise<PeerReferralJoinState> {
  // Avant toute autre validation : sans prise de connaissance de la politique
  // de confidentialité, aucune donnée ne doit même être examinée.
  if (!hasAcceptedPrivacyPolicy(formData)) return { error: PRIVACY_REFUSED_MESSAGE };

  const parsed = joinSchema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
    matriculeManual: formData.get("matriculeManual"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const parsedLevels = parseLevelHoursFromFormData(formData);
  if (!parsedLevels.ok) {
    return { error: parsedLevels.error };
  }

  // Revalidé ici plutôt que fait confiance à la page : un lien peut avoir été
  // consommé ou avoir expiré entre l'affichage du formulaire et sa soumission.
  const referral = await prisma.peerReferral.findUnique({
    where: { tokenHash: hashPeerReferralToken(parsed.data.token) },
  });
  if (!referral) {
    return { error: "Ce lien de parrainage n'est pas valide." };
  }
  if (referral.usedAt) {
    return { error: "Ce lien de parrainage a déjà été utilisé." };
  }
  if (referral.expiresAt < new Date()) {
    return {
      error: "Ce lien de parrainage a expiré. Demandez-en un nouveau à la personne qui vous l'a transmis.",
    };
  }

  const email = parsed.data.email.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Ne dit plus seulement « connectez-vous » : c'était une impasse, qui
    // abandonnait au passage la participation portée par ce lien. Une fois
    // connectée, la personne rouvre CE lien et le panneau de confirmation
    // l'attend (cf. attachParticipationFromReferral, et la page).
    return {
      error:
        "Un compte existe déjà avec cet email. Connectez-vous, puis rouvrez ce lien depuis votre email pour valider votre participation.",
    };
  }

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const account = await createTeacherAccountAndMembership(tx, {
        schoolId: referral.schoolId,
        identity: parsed.data,
        levels: parsedLevels.data,
        privacy: privacyAcceptanceRecord(),
      });

      // Le jeton est consommé dans la même transaction que la création du
      // compte : deux soumissions simultanées du même lien ne peuvent pas
      // produire deux comptes.
      await tx.peerReferral.update({ where: { id: referral.id }, data: { usedAt: new Date() } });

      // Ouvrir CE lien précis vaut confirmation immédiate de la participation
      // — la personne crée son compte pour valider une collaboration déjà
      // vécue, pas pour en être notifiée plus tard comme un tiers tagué après
      // coup (cf. app/(app)/declarer/actions.ts pour ce second cas).
      if (referral.periodId) {
        await tx.periodParticipant.create({
          data: {
            periodId: referral.periodId,
            userId: account.user.id,
            membershipId: account.membership.id,
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });
      }

      return account;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("matricule")) {
        return { error: "Ce numéro de matricule est déjà utilisé par un autre compte." };
      }
      return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    throw error;
  }

  await logAudit({
    schoolId: referral.schoolId,
    actorId: created.user.id,
    action: AuditAction.JOIN_VIA_PEER_REFERRAL,
    targetType: "Membership",
    targetId: created.membership.id,
    metadata: { referredByMembershipId: referral.referredByMembershipId, periodId: referral.periodId },
  });

  const schoolYear = await getCurrentSchoolYear();
  if (schoolYear) {
    await recomputeUserQuotas(created.user.id, schoolYear.id);
  }

  // Ce lien-ci a confirmé SA période ci-dessus. Mais plusieurs collègues ont
  // pu inviter la même adresse pour des activités différentes : les autres
  // parrainages ouverts sont rattachés ici, en attente de validation.
  await reconcilePeerReferralsForMember({
    userId: created.user.id,
    membershipId: created.membership.id,
    schoolId: referral.schoolId,
    email,
  });

  // Avant signIn, qui redirige : rien ne s'exécuterait après.
  await notifySchoolDirectionOfNewMember(created.membership.id);

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/mes-periodes",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais connexion automatique impossible. Merci de vous connecter." };
    }
    throw error; // laisse passer la redirection interne de signIn en cas de succès
  }
}

// Parcours public : la personne s'inscrit ou agit en son nom propre. Un
// cookie de démonstration encore présent dans son navigateur ne doit pas
// bloquer l'écriture (cf. lib/demo-mode.ts::horsDemo).
export async function joinViaPeerReferral(
  _prevState: PeerReferralJoinState | undefined,
  formData: FormData
): Promise<PeerReferralJoinState> {
  return horsDemo(() => joinViaPeerReferralImpl(_prevState, formData));
}

// ---------------------------------------------------------------------------
// RATTACHEMENT À UN COMPTE QUI EXISTE DÉJÀ
// ---------------------------------------------------------------------------

export type ReferralAttachState = { error?: string };

/// Valide la participation portée par ce lien pour la personne DÉJÀ connectée.
///
/// Le parcours de parrainage ne savait créer un compte. Qui en avait un se
/// heurtait à « Un compte existe déjà avec cet email » — jeton intact,
/// participation jamais créée, et le lien « Se connecter » de la page
/// abandonnait le jeton en chemin. Impasse complète, alors que c'est le cas
/// le plus naturel : on s'inscrit avec le code de sa direction, puis on
/// retourne voir cet email qu'un collègue a envoyé.
///
/// CONFIRMED d'emblée, comme à la création de compte par ce même lien : la
/// personne a ouvert le lien et cliqué sur le bouton, le geste est explicite.
/// C'est la différence avec le rattachement automatique, muet, qui laisse en
/// attente (cf. lib/peer-referral-reconcile.ts).
async function attachParticipationFromReferralImpl(
  _prevState: ReferralAttachState | undefined,
  formData: FormData
): Promise<ReferralAttachState> {
  const session = await auth();
  if (!session) {
    return { error: "Votre session a expiré. Reconnectez-vous, puis rouvrez ce lien." };
  }

  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Lien invalide." };

  // Revalidé ici, comme à la création de compte : le lien a pu être consommé
  // ou expirer entre l'affichage de la page et le clic.
  const referral = await prisma.peerReferral.findUnique({
    where: { tokenHash: hashPeerReferralToken(token) },
  });
  if (!referral) return { error: "Ce lien de parrainage n'est pas valide." };
  if (referral.usedAt) return { error: "Ce lien de parrainage a déjà été utilisé." };
  if (referral.expiresAt < new Date()) {
    return {
      error:
        "Ce lien de parrainage a expiré. Demandez à la personne qui vous l'a transmis de modifier sa période pour vous y ajouter.",
    };
  }

  // Le lien ouvert par celui ou celle qui l'a envoyé : curiosité bien
  // naturelle — « que reçoit ma collègue ? » — qui consommerait le jeton et
  // laisserait la vraie destinataire devant un lien mort.
  const parrain = await prisma.membership.findUnique({
    where: { id: referral.referredByMembershipId },
    select: { userId: true },
  });
  if (parrain?.userId === session.userId) {
    return {
      error:
        "Ce lien est celui que vous avez envoyé : c'est à votre collègue de l'ouvrir pour valider sa participation.",
    };
  }

  const compte = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  // Contrainte @@unique([userId, schoolId]) : au plus UNE Membership pour ce
  // couple, pour toujours. On réactive l'existante plutôt que d'en créer une
  // seconde — même invariant que /rejoindre-ecole.
  const existing = await prisma.membership.findUnique({
    where: { userId_schoolId: { userId: session.userId, schoolId: referral.schoolId } },
  });

  let membershipId: string;
  let entreeDansLEcole = false;
  if (existing?.status === "ACTIVE") {
    membershipId = existing.id;
  } else if (existing) {
    // Rôle explicitement remis à ENSEIGNANT : un ancien rôle élevé n'est
    // jamais restauré en silence (cf. app/(app)/rejoindre-ecole/actions.ts).
    const reactivated = await prisma.membership.update({
      where: { id: existing.id },
      data: { role: "ENSEIGNANT", status: "ACTIVE", removedAt: null, joinedAt: new Date() },
    });
    membershipId = reactivated.id;
    entreeDansLEcole = true;
  } else {
    const createdMembership = await prisma.membership.create({
      data: {
        userId: session.userId,
        schoolId: referral.schoolId,
        role: "ENSEIGNANT",
        status: "ACTIVE",
      },
    });
    membershipId = createdMembership.id;
    entreeDansLEcole = true;
  }

  const fait = await prisma.$transaction(async (tx) => {
    // Jeton réservé d'abord, et seulement s'il est encore ouvert : deux clics
    // concurrents ne peuvent pas aboutir tous les deux.
    const reserve = await tx.peerReferral.updateMany({
      where: { id: referral.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (reserve.count === 0) return false;

    if (referral.periodId) {
      // upsert : l'auteur a pu, entre-temps, dépanner en rééditant sa période
      // pour y cocher la personne. Le clic vaut alors validation de la ligne
      // déjà créée. `membershipId` n'est volontairement PAS réécrit sur une
      // ligne existante : il fixe l'école où cette période compte, et une
      // période inter-écoles ne doit pas changer de colonne ici.
      await tx.periodParticipant.upsert({
        where: { periodId_userId: { periodId: referral.periodId, userId: session.userId } },
        update: { status: "CONFIRMED", confirmedAt: new Date() },
        create: {
          periodId: referral.periodId,
          userId: session.userId,
          membershipId,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });
    }
    return true;
  });
  if (!fait) return { error: "Ce lien de parrainage a déjà été utilisé." };

  await logAudit({
    schoolId: referral.schoolId,
    actorId: session.userId,
    action: AuditAction.ATTACH_VIA_PEER_REFERRAL,
    targetType: "Membership",
    targetId: membershipId,
    metadata: {
      referredByMembershipId: referral.referredByMembershipId,
      periodId: referral.periodId,
      entreeDansLEcole,
    },
  });

  if (entreeDansLEcole) {
    // Aucun niveau/heures n'a été demandé ici — le formulaire d'inscription
    // les réclame, ce bouton non : il n'a qu'une participation à valider. Le
    // quota retombe donc sur l'objectif par défaut jusqu'à ce que la personne
    // complète sa charge dans Mon profil, ce que la page lui indique.
    const schoolYear = await getCurrentSchoolYear();
    if (schoolYear) {
      await recomputeUserQuotas(session.userId, schoolYear.id);
    }
    await notifySchoolDirectionOfNewMember(membershipId);
  }

  // Les autres collègues ont pu inviter la même adresse pour d'autres
  // activités : ces périodes-là sont rattachées en attente de validation.
  if (compte?.email) {
    await reconcilePeerReferralsForMember({
      userId: session.userId,
      membershipId,
      schoolId: referral.schoolId,
      email: compte.email,
    });
  }

  // École active basculée sur celle du parrainage : /mes-periodes est scopé
  // sur la Membership active (cf. app/(app)/mes-periodes/page.tsx). Sans ce
  // basculement, une personne rattachée à plusieurs écoles validerait sa
  // participation puis atterrirait sur une liste où elle ne la voit pas.
  await setActiveSchoolCookie(referral.schoolId, session.userId);
  revalidatePath("/", "layout");
  redirect("/mes-periodes");
}

// Le compte de démonstration ne peut rien écrire (cf. lib/demo-mode.ts) : on
// traduit le refus en message lisible plutôt qu'en page d'erreur. `redirect`
// lance une exception propre à Next, que demoErrorState ignore et qui est
// donc relancée — c'est bien le succès qui passe par là.
export async function attachParticipationFromReferral(
  _prevState: ReferralAttachState | undefined,
  formData: FormData
): Promise<ReferralAttachState> {
  try {
    return await attachParticipationFromReferralImpl(_prevState, formData);
  } catch (error) {
    const demo = demoErrorState(error);
    if (demo) return demo;
    throw error;
  }
}
