"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
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

export type PeerReferralJoinState = { error?: string };

const joinSchema = teacherIdentitySchema.and(z.object({ token: z.string().min(1, "Lien invalide.") }));

export async function joinViaPeerReferral(
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
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
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
