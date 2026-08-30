import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/lib/audit-log";
import { reseauPlateforme, regionPlateforme } from "@/lib/fwb-directory";

// Règles de résolution de l'école visée, communes aux deux parcours de
// rattachement : la création de compte (app/(auth)/rejoindre) et l'ajout
// d'une école à un compte existant (app/(app)/rejoindre-ecole). Les deux
// offrent les mêmes chemins — code, école déjà inscrite, inscription libre —
// et doivent appliquer exactement les mêmes gardes, d'où ce module partagé
// plutôt qu'une logique dupliquée de part et d'autre.

/// École PARTIAL dont la direction doit être (re)prévenue : chaque nouveau
/// ralliement relance l'invitation tant que l'école n'est pas officiellement
/// inscrite (cf. lib/mailer.ts::sendDirectionInvitationEmail).
export type PartialSchoolNotice = {
  name: string;
  numeroFase: string | null;
  directionEmail: string;
};

export type JoinTarget = {
  schoolId: string;
  auditAction: string;
  partialNotice: PartialSchoolNotice | null;
};

export type JoinTargetResult = { ok: true; target: JoinTarget } | { ok: false; error: string };

function partialNoticeOf(school: {
  name: string;
  numeroFase: string | null;
  directionEmail: string | null;
}): PartialSchoolNotice | null {
  return school.directionEmail
    ? { name: school.name, numeroFase: school.numeroFase, directionEmail: school.directionEmail }
    : null;
}

/// Résout une école DÉJÀ présente sur la plateforme, jamais à partir d'un
/// schoolId client pris pour argent comptant :
/// - un code tapé à la main doit résoudre un JoinCode actif ;
/// - une école APPROVED choisie dans la liste passe par ce même code actif ;
/// - une école PARTIAL n'a aucun code (personne n'y a le droit d'en générer),
///   son cercle étant volontairement ouvert à qui la trouve par son nom.
export async function resolveExistingSchoolTarget(params: {
  code: string | null;
  schoolId: string | null;
}): Promise<JoinTargetResult> {
  if (params.code) {
    const joinCode = await prisma.joinCode.findUnique({ where: { code: params.code.toUpperCase() } });
    // Message générique : ne révèle jamais si le code existe mais est désactivé.
    if (!joinCode || !joinCode.active) return { ok: false, error: "Code de rattachement invalide ou expiré." };
    return {
      ok: true,
      target: { schoolId: joinCode.schoolId, auditAction: AuditAction.JOIN_VIA_CODE, partialNotice: null },
    };
  }

  if (!params.schoolId) {
    return { ok: false, error: "Choisissez un code de rattachement ou une école dans la liste." };
  }

  const school = await prisma.school.findUnique({ where: { id: params.schoolId } });
  if (!school) return { ok: false, error: "École introuvable." };

  if (school.status === "PARTIAL") {
    return {
      ok: true,
      target: {
        schoolId: school.id,
        auditAction: AuditAction.JOIN_PARTIAL_SCHOOL,
        partialNotice: partialNoticeOf(school),
      },
    };
  }

  const joinCode = await prisma.joinCode.findFirst({
    where: { schoolId: school.id, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!joinCode) return { ok: false, error: "Code de rattachement invalide ou expiré." };
  return {
    ok: true,
    target: { schoolId: joinCode.schoolId, auditAction: AuditAction.JOIN_VIA_CODE, partialNotice: null },
  };
}

export type FwbSchoolForInitiation = NonNullable<Awaited<ReturnType<typeof prisma.fwbSchool.findUnique>>>;

/// Vérifie qu'une école de l'annuaire peut servir de base à une inscription
/// libre : elle doit exister au référentiel et ne pas être déjà sur la
/// plateforme, quel que soit son statut — la bonne porte d'entrée existe
/// alors déjà (« Chercher mon école »), et un doublon violerait de toute
/// façon l'unicité de numeroFase.
export async function loadFwbSchoolForInitiation(
  numeroFase: string
): Promise<{ ok: true; fwbSchool: FwbSchoolForInitiation } | { ok: false; error: string }> {
  const fwbSchool = await prisma.fwbSchool.findUnique({ where: { numeroFase } });
  if (!fwbSchool) {
    return { ok: false, error: "École introuvable dans l'annuaire. Recherchez-la à nouveau." };
  }

  const dejaPresente = await prisma.school.findUnique({ where: { numeroFase } });
  if (dejaPresente) {
    return {
      ok: false,
      error: "Cette école est déjà sur la plateforme. Utilisez plutôt « Chercher mon école » pour la rejoindre.",
    };
  }

  return { ok: true, fwbSchool };
}

/// Crée l'école en statut PARTIAL à partir de sa fiche d'annuaire. Aucun
/// JoinCode n'est généré : personne n'y détient de rôle de gestion (cf.
/// permissions.md), le cercle se propage par parrainage ou par recherche du
/// nom. `directionEmail` ne sert qu'à prévenir la direction, jamais à créer
/// un compte à sa place.
export async function createPartialSchoolRecord(
  tx: Prisma.TransactionClient,
  fwbSchool: FwbSchoolForInitiation,
  directionEmail: string
) {
  return tx.school.create({
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
      directionEmail,
      directionNotifiedAt: new Date(),
    },
  });
}
