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
import { getBaseUrl, sendDirectionInvitationEmail } from "@/lib/mailer";
import { civilityAndLastName } from "@/lib/civility";
import { reseauPlateforme, regionPlateforme } from "@/lib/fwb-directory";

export type JoinState = { error?: string };

/// Un seul <form>/useActionState côté client pour les trois chemins
/// (code, école déjà inscrite, école à initier) — évite de dupliquer les
/// champs communs (niveaux, identité, identifiants) dans trois formulaires
/// séparés. Le dispatch se fait sur un simple champ caché (cf.
/// components/join-form.tsx), jamais sur une donnée qui déciderait, elle,
/// des droits accordés.
export async function submitJoin(prevState: JoinState | undefined, formData: FormData): Promise<JoinState> {
  if (formData.get("joinMode") === "initiate") {
    return initiatePartialSchool(prevState, formData);
  }
  return joinViaCode(prevState, formData);
}

// Deux façons d'identifier l'école, au choix de l'enseignant·e (cf.
// components/join-form.tsx) : le code reçu de sa direction, ou l'école
// elle-même choisie dans une liste — les deux résolvent au même JoinCode actif
// ci-dessous, donc la même garantie de sécurité (une école sans code actif
// n'est joignable par aucun des deux chemins).
const joinSchema = teacherIdentitySchema
  .and(
    z.object({
      code: z.string().transform((v) => v.trim() || null),
      schoolId: z.string().transform((v) => v.trim() || null),
    })
  )
  .refine((data) => !!data.code || !!data.schoolId, {
    message: "Choisissez un code de rattachement ou une école dans la liste.",
    path: ["code"],
  });

export async function joinViaCode(
  _prevState: JoinState | undefined,
  formData: FormData
): Promise<JoinState> {
  const parsed = joinSchema.safeParse({
    code: formData.get("code") ?? "",
    schoolId: formData.get("schoolId") ?? "",
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

  const email = parsed.data.email.trim();

  // Trois façons d'arriver ici, jamais un schoolId de client pris pour
  // argent comptant sans revérification :
  // - un code tapé à la main → doit résoudre un JoinCode actif ;
  // - une école APPROVED choisie dans la liste → idem, via son code actif ;
  // - une école PARTIAL choisie dans la liste → aucun code n'existe (aucun
  //   membre n'y a de droit de gestion pour en générer un), le cercle étant
  //   volontairement ouvert à qui le trouve par son nom.
  let targetSchoolId: string;
  let auditAction: string = AuditAction.JOIN_VIA_CODE;
  if (parsed.data.code) {
    const joinCode = await prisma.joinCode.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
    if (!joinCode || !joinCode.active) {
      // Message générique : ne révèle jamais si le code existe mais est désactivé.
      return { error: "Code de rattachement invalide ou expiré." };
    }
    targetSchoolId = joinCode.schoolId;
  } else {
    const school = await prisma.school.findUnique({ where: { id: parsed.data.schoolId! } });
    if (!school) return { error: "École introuvable." };
    if (school.status === "PARTIAL") {
      targetSchoolId = school.id;
      auditAction = AuditAction.JOIN_PARTIAL_SCHOOL;
    } else {
      const joinCode = await prisma.joinCode.findFirst({
        where: { schoolId: school.id, active: true },
        orderBy: { createdAt: "desc" },
      });
      if (!joinCode) return { error: "Code de rattachement invalide ou expiré." };
      targetSchoolId = joinCode.schoolId;
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  let created;
  try {
    created = await prisma.$transaction((tx) =>
      createTeacherAccountAndMembership(tx, {
        schoolId: targetSchoolId,
        identity: parsed.data,
        levels: parsedLevels.data,
      })
    );
  } catch (error) {
    // Filet de sécurité si deux soumissions concurrentes visent le même email
    // (le contrôle findUnique ci-dessus n'est pas atomique avec la création),
    // ou plus rarement, le même matricule.
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
    schoolId: targetSchoolId,
    actorId: created.user.id,
    action: auditAction,
    targetType: "Membership",
    targetId: created.membership.id,
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

export type JoinableSchool = {
  id: string;
  name: string;
  locality: string | null;
  status: "APPROVED" | "PARTIAL";
};

/// Alternative au code de rattachement tapé à l'aveugle : l'enseignant·e
/// cherche son école déjà inscrite par son nom (cf.
/// components/joinable-school-search.tsx). Deux catégories remontent, toutes
/// deux garanties joignables ensuite par joinViaCode : les écoles APPROVED
/// avec un JoinCode actif, et les écoles PARTIAL (cercle informel initié par
/// un·e enseignant·e, cf. initiatePartialSchool) — ouvertes à qui les trouve
/// par leur nom, faute d'un code que personne n'y a le droit de générer.
export async function searchJoinableSchools(query: string): Promise<JoinableSchool[]> {
  const terme = query.trim();
  if (terme.length < 2) return [];

  const schools = await prisma.school.findMany({
    where: {
      name: { contains: terme, mode: "insensitive" },
      OR: [{ status: "APPROVED", joinCodes: { some: { active: true } } }, { status: "PARTIAL" }],
    },
    select: { id: true, name: true, locality: true, status: true },
    orderBy: { name: "asc" },
    take: 10,
  });
  return schools as JoinableSchool[];
}

const initiateSchema = teacherIdentitySchema.and(
  z.object({
    numeroFase: z.string().min(1, "Choisissez votre école dans la liste."),
    directionEmail: z.string().email("Adresse email de la direction invalide."),
  })
);

/// Un·e enseignant·e réunit son petit cercle de collègues sans attendre une
/// inscription officielle par sa direction — sans jamais prendre un rôle de
/// gestion (toujours ENSEIGNANT, cf. createTeacherAccountAndMembership) : se
/// déclarer fondateur d'un espace école, même relabellisé Admin, est mal vu
/// des directions quand ça vient d'un enseignant. L'école créée reste
/// PARTIAL — opérationnelle tout de suite pour ce cercle (cf.
/// app/(app)/layout.tsx), sans validation plateforme, mais sans personne
/// pour en générer un JoinCode : la suite se joue par parrainage entre pairs
/// (cf. app/(app)/inviter) ou par recherche du nom (searchJoinableSchools).
export async function initiatePartialSchool(
  _prevState: JoinState | undefined,
  formData: FormData
): Promise<JoinState> {
  const parsed = initiateSchema.safeParse({
    numeroFase: formData.get("numeroFase") ?? "",
    directionEmail: formData.get("directionEmail") ?? "",
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

  const fwbSchool = await prisma.fwbSchool.findUnique({ where: { numeroFase: parsed.data.numeroFase } });
  if (!fwbSchool) return { error: "École introuvable dans l'annuaire. Recherchez-la à nouveau." };

  // Ne réinitie jamais une école déjà présente sur la plateforme, quel que
  // soit son statut — un doublon violerait l'unicité de numeroFase, mais
  // surtout, la bonne porte d'entrée existe déjà : "Chercher mon école".
  const dejaPresente = await prisma.school.findUnique({ where: { numeroFase: parsed.data.numeroFase } });
  if (dejaPresente) {
    return {
      error:
        "Cette école est déjà sur la plateforme. Utilisez plutôt « Chercher mon école » pour la rejoindre.",
    };
  }

  const email = parsed.data.email.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  let created;
  let schoolId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: fwbSchool.name,
          reseau: reseauPlateforme(fwbSchool.reseau),
          region: regionPlateforme(fwbSchool.bassin),
          niveaux: fwbSchool.niveaux,
          typesEnseignement: fwbSchool.genres,
          address: fwbSchool.address,
          postalCode: fwbSchool.postalCode,
          locality: fwbSchool.locality,
          numeroFase: fwbSchool.numeroFase,
          status: "PARTIAL",
          directionEmail: parsed.data.directionEmail,
          directionNotifiedAt: new Date(),
        },
      });
      const account = await createTeacherAccountAndMembership(tx, {
        schoolId: school.id,
        identity: parsed.data,
        levels: parsedLevels.data,
      });
      return { school, account };
    });
    created = result.account;
    schoolId = result.school.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("matricule")) {
        return { error: "Ce numéro de matricule est déjà utilisé par un autre compte." };
      }
      if (target.includes("numeroFase")) {
        return {
          error:
            "Cette école vient d'être inscrite entre-temps. Utilisez plutôt « Chercher mon école » pour la rejoindre.",
        };
      }
      return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    throw error;
  }

  await logAudit({
    schoolId,
    actorId: created.user.id,
    action: AuditAction.INITIATE_PARTIAL_SCHOOL,
    targetType: "School",
    targetId: schoolId,
    metadata: { directionEmail: parsed.data.directionEmail },
  });

  const schoolYear = await getCurrentSchoolYear();
  if (schoolYear) {
    await recomputeUserQuotas(created.user.id, schoolYear.id);
  }

  // Avant signIn, qui redirige : rien ne s'exécuterait après. Best effort,
  // comme les autres notifications de la plateforme : un SMTP injoignable ne
  // doit jamais faire perdre le compte déjà créé.
  try {
    const baseUrl = await getBaseUrl();
    await sendDirectionInvitationEmail({
      to: parsed.data.directionEmail,
      schoolName: fwbSchool.name,
      initiatorCivility: civilityAndLastName(parsed.data),
      numeroFase: fwbSchool.numeroFase,
      createEcoleUrl: `${baseUrl}/creer-ecole`,
    });
  } catch (error) {
    console.error("[partial-school] Échec d'envoi de l'invitation à la direction :", error);
  }

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
