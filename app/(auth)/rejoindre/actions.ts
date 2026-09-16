"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { parseLevelHoursFromFormData } from "@/lib/teaching-levels";
import { recomputeUserQuotas } from "@/lib/quota-engine";
import {
  notifyDirectionOfPartialSchool,
  notifySchoolDirectionOfNewMember,
} from "@/lib/school-notifications";
import { getCurrentSchoolYear } from "@/lib/current-school-year";
import { teacherIdentitySchema, createTeacherAccountAndMembership } from "@/lib/teacher-signup";
import { civilityAndLastName } from "@/lib/civility";
import {
  hasAcceptedPrivacyPolicy,
  privacyAcceptanceRecord,
  PRIVACY_REFUSED_MESSAGE,
} from "@/lib/privacy-policy";
import {
  createPartialSchoolRecord,
  loadFwbSchoolForInitiation,
  resolveExistingSchoolTarget,
} from "@/lib/school-join-target";

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
  // Avant toute autre validation : sans prise de connaissance de la politique
  // de confidentialité, aucune donnée ne doit même être examinée.
  if (!hasAcceptedPrivacyPolicy(formData)) return { error: PRIVACY_REFUSED_MESSAGE };

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

  // Règles communes aux deux parcours de rattachement (cf.
  // lib/school-join-target.ts) : code actif, école APPROVED via son code, ou
  // école PARTIAL ouverte à qui la trouve par son nom.
  const resolved = await resolveExistingSchoolTarget({
    code: parsed.data.code,
    schoolId: parsed.data.schoolId,
  });
  if (!resolved.ok) return { error: resolved.error };
  // partialNotice n'est renseigné que pour une école PARTIAL : chaque nouveau
  // ralliement relance l'invitation à la direction (cf. plus bas), pas
  // seulement celui de l'enseignant·e qui l'a initiée.
  const { schoolId: targetSchoolId, auditAction, partialNotice } = resolved.target;

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
        privacy: privacyAcceptanceRecord(),
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

  // Avant signIn, qui redirige : rien ne s'exécuterait après. No-op tant
  // qu'aucun Admin/Direction n'existe (cas de toute école PARTIAL).
  await notifySchoolDirectionOfNewMember(created.membership.id);

  // Chaque nouvel enseignant qui rejoint un cercle PARTIAL relance
  // l'invitation à la direction — pas seulement l'initiateur — tant que
  // l'école n'est pas officiellement inscrite. Best effort, comme les autres
  // notifications de la plateforme : un SMTP injoignable ne doit jamais
  // faire perdre le compte déjà créé.
  if (partialNotice) {
    await notifyDirectionOfPartialSchool(targetSchoolId, partialNotice, civilityAndLastName(parsed.data));
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
  // Avant toute autre validation : sans prise de connaissance de la politique
  // de confidentialité, aucune donnée ne doit même être examinée.
  if (!hasAcceptedPrivacyPolicy(formData)) return { error: PRIVACY_REFUSED_MESSAGE };

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

  const annuaire = await loadFwbSchoolForInitiation(parsed.data.numeroFase);
  if (!annuaire.ok) return { error: annuaire.error };
  const { fwbSchool } = annuaire;

  const email = parsed.data.email.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  let created;
  let schoolId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const school = await createPartialSchoolRecord(tx, fwbSchool, parsed.data.directionEmail);
      const account = await createTeacherAccountAndMembership(tx, {
        schoolId: school.id,
        identity: parsed.data,
        levels: parsedLevels.data,
        privacy: privacyAcceptanceRecord(),
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

  // Avant signIn, qui redirige : rien ne s'exécuterait après.
  await notifyDirectionOfPartialSchool(
    schoolId,
    {
      name: fwbSchool.name,
      numeroFase: fwbSchool.numeroFase,
      directionEmail: parsed.data.directionEmail,
    },
    civilityAndLastName(parsed.data)
  );

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
