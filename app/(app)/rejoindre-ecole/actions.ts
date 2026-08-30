"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveSchoolCookie } from "@/lib/active-school";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { resolveOrCreateDiscipline } from "@/lib/discipline-form";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import {
  notifyDirectionOfPartialSchool,
  notifySchoolDirectionOfNewMember,
} from "@/lib/school-notifications";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { civilityAndLastName } from "@/lib/civility";
import { FORM_JOIN_SCHOOL, logFormRejection } from "@/lib/form-rejections";
import {
  createPartialSchoolRecord,
  loadFwbSchoolForInitiation,
  resolveExistingSchoolTarget,
  type PartialSchoolNotice,
} from "@/lib/school-join-target";

/// Consigne le motif du refus — jamais le code saisi ni l'identité — puis rend
/// le message affiché à la personne (cf. lib/form-rejections.ts).
async function consigner(message: string, champ: string | null): Promise<string> {
  await logFormRejection(FORM_JOIN_SCHOOL, message, champ);
  return message;
}

export type JoinSchoolState = { error?: string };

// Mêmes trois chemins que le formulaire d'inscription (cf.
// app/(auth)/rejoindre/actions.ts) : un enseignant déjà rattaché à une école
// doit pouvoir en rejoindre une autre par code, en la cherchant par son nom,
// ou en l'initiant librement — pas seulement par code.
const joinSchoolSchema = z.object({
  joinMode: z.string(),
  code: z.string().transform((v) => v.trim() || null),
  schoolId: z.string().transform((v) => v.trim() || null),
  numeroFase: z.string().transform((v) => v.trim() || null),
  directionEmail: z.string().transform((v) => v.trim() || null),
});

export async function joinSchoolWithCode(
  _prevState: JoinSchoolState | undefined,
  formData: FormData
): Promise<JoinSchoolState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const parsed = joinSchoolSchema.safeParse({
    joinMode: formData.get("joinMode") ?? "join",
    code: formData.get("code") ?? "",
    schoolId: formData.get("schoolId") ?? "",
    numeroFase: formData.get("numeroFase") ?? "",
    directionEmail: formData.get("directionEmail") ?? "",
  });
  if (!parsed.success) return { error: await consigner("Formulaire invalide.", null) };

  const parsedLevels = parseLevelHoursFromFormData(formData);
  if (!parsedLevels.ok) return { error: parsedLevels.error };

  const initiation = parsed.data.joinMode === "initiate";

  let schoolId: string;
  let membershipId: string;
  let auditAction: string;
  let partialNotice: PartialSchoolNotice | null = null;

  if (initiation) {
    if (!parsed.data.numeroFase) {
      return { error: await consigner("Choisissez votre école dans la liste.", "numeroFase") };
    }
    const emailValide =
      parsed.data.directionEmail !== null &&
      z.string().email().safeParse(parsed.data.directionEmail).success;
    if (!emailValide) {
      return { error: await consigner("Adresse email de la direction invalide.", "directionEmail") };
    }
    const directionEmail = parsed.data.directionEmail!;

    const annuaire = await loadFwbSchoolForInitiation(parsed.data.numeroFase);
    if (!annuaire.ok) return { error: await consigner(annuaire.error, "numeroFase") };

    // École et rattachement dans la même transaction : un échec de la seconde
    // ne doit pas laisser une école PARTIAL sans le moindre membre.
    try {
      const result = await prisma.$transaction(async (tx) => {
        const school = await createPartialSchoolRecord(tx, annuaire.fwbSchool, directionEmail);
        const membership = await tx.membership.create({
          data: { userId: session.userId, schoolId: school.id, role: "ENSEIGNANT", status: "ACTIVE" },
        });
        return { school, membership };
      });
      schoolId = result.school.id;
      membershipId = result.membership.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return {
          error: await consigner(
            "Cette école vient d'être inscrite entre-temps. Utilisez plutôt « Chercher mon école » pour la rejoindre.",
            "numeroFase"
          ),
        };
      }
      throw error;
    }
    auditAction = AuditAction.INITIATE_PARTIAL_SCHOOL;
    partialNotice = {
      name: annuaire.fwbSchool.name,
      numeroFase: annuaire.fwbSchool.numeroFase,
      directionEmail,
    };
  } else {
    const resolved = await resolveExistingSchoolTarget({
      code: parsed.data.code,
      schoolId: parsed.data.schoolId,
    });
    if (!resolved.ok) return { error: await consigner(resolved.error, parsed.data.code ? "code" : null) };
    schoolId = resolved.target.schoolId;
    auditAction = resolved.target.auditAction;
    partialNotice = resolved.target.partialNotice;

    // Contrainte @@unique([userId, schoolId]) : au plus UNE Membership pour ce
    // couple, pour toujours — même après un retrait. On ne crée jamais une 2e
    // ligne, on réactive l'existante le cas échéant.
    const existing = await prisma.membership.findUnique({
      where: { userId_schoolId: { userId: session.userId, schoolId } },
    });

    if (existing?.status === "ACTIVE") {
      return { error: await consigner("Vous êtes déjà membre de cette école.", null) };
    }

    if (existing) {
      // Réactivation : rôle explicitement remis à ENSEIGNANT — un ancien rôle
      // élevé (référent/direction) n'est jamais restauré silencieusement ; la
      // direction/référent de cette école devra le régénérer via /ecole/membres.
      const reactivated = await prisma.membership.update({
        where: { id: existing.id },
        data: {
          role: "ENSEIGNANT",
          status: "ACTIVE",
          removedAt: null,
          joinedAt: new Date(),
        },
      });
      membershipId = reactivated.id;
    } else {
      try {
        const createdMembership = await prisma.membership.create({
          data: {
            userId: session.userId,
            schoolId,
            role: "ENSEIGNANT",
            status: "ACTIVE",
          },
        });
        membershipId = createdMembership.id;
      } catch (error) {
        // Filet de sécurité en cas de double-soumission concurrente.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return { error: "Vous êtes déjà membre de cette école." };
        }
        throw error;
      }
    }
  }

  // Remplace plutôt que cumule : en cas de réactivation, d'anciennes lignes
  // ne doivent pas se combiner avec la nouvelle déclaration.
  await prisma.membershipLevelHours.deleteMany({ where: { membershipId } });
  for (const l of parsedLevels.data) {
    const discipline = await resolveOrCreateDiscipline(prisma, l.disciplineCode, l.disciplineLabel);
    await prisma.membershipLevelHours.create({
      data: { membershipId, level: l.level, hours: l.hours, disciplineId: discipline.id },
    });
  }

  await logAudit({
    schoolId,
    actorId: session.userId,
    action: auditAction,
    targetType: initiation ? "School" : "Membership",
    targetId: initiation ? schoolId : membershipId,
  });

  // Recalcule l'ETP/quota de TOUTES les écoles de cet utilisateur (pas
  // seulement celle-ci) : le total ETP vient de changer, cf. lib/quota-engine.ts.
  const schoolYear = await getCurrentSchoolYear();
  if (schoolYear) {
    await recomputeUserQuotas(session.userId, schoolYear.id);
  }

  await notifySchoolDirectionOfNewMember(membershipId);

  // Chaque ralliement à une école PARTIAL relance l'invitation à sa direction,
  // tant qu'elle n'est pas officiellement inscrite.
  if (partialNotice) {
    const acteur = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, sex: true },
    });
    await notifyDirectionOfPartialSchool(
      schoolId,
      partialNotice,
      acteur ? civilityAndLastName(acteur) : "Un·e enseignant·e"
    );
  }

  await setActiveSchoolCookie(schoolId, session.userId);
  revalidatePath("/", "layout");
  redirect("/mes-periodes");
}
