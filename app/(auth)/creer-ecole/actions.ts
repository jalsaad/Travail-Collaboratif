"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createJoinCodeForSchool } from "@/lib/join-codes";
import { logAudit, AuditAction } from "@/lib/audit-log";
import { isReseauEtranger } from "@/lib/reseau-options";
import { notifyPlatformOfNewSchool } from "@/lib/school-notifications";
import { computeMatricule, MATRICULE_MANUAL_PATTERN } from "@/lib/matricule";
import { saveSchoolLogo, validateLogoFile, InvalidLogoError } from "@/lib/school-logo";
import {
  normaliserFase,
  regionPlateforme,
  reseauIncertain,
  reseauPlateforme,
} from "@/lib/fwb-directory";
import { canonicalLocality } from "@/lib/belgian-postal-codes";

export type CreateSchoolState = { error?: string };

const schoolSchema = z.object({
  name: z.string().min(1, "Nom de l'école requis"),
  reseau: z.string().min(1, "Réseau d'enseignement requis"),
  region: z.string().min(1, "Région requise"),
  address: z.string().min(1, "Rue et numéro requis"),
  postalCode: z.string().min(1, "Code postal requis"),
  locality: z.string().min(1, "Localité requise"),
  phone: z.string().min(1, "Téléphone requis"),
  numeroFase: z.string().min(1, "Numéro FASE requis"),
  // Exigé uniquement pour les écoles à programme belge à l'étranger, où le
  // code postal ne suffit pas à localiser l'établissement.
  country: z.string().transform((v) => v.trim() || null).nullable(),
}).refine(
  (data) => !isReseauEtranger(data.reseau) || !!data.country,
  { message: "Pays requis pour une école à programme belge à l'étranger.", path: ["country"] }
);

const niveauSchema = z.enum(["MATERNELLE", "PRIMAIRE", "SECONDAIRE"]);
const typeEnseignementSchema = z.enum(["ORDINAIRE", "SPECIALISE"]);

// Fonction déclarative choisie par le fondateur — distincte du Role qui
// pilote les permissions réelles (cf. commentaire sur Membership.fonction
// dans prisma/schema.prisma). Direction/Direction adjointe donnent le rôle
// DIRECTION (plein pouvoir sur l'école) ; Autre donne REFERENT_NUMERIQUE.
const founderRoleSchema = z
  .object({
    fonction: z.enum(["Direction", "Direction adjointe", "Autre"], { message: "Fonction requise" }),
    fonctionAutre: z.string().optional(),
  })
  .refine((data) => data.fonction !== "Autre" || !!data.fonctionAutre?.trim(), {
    message: "Précisez votre fonction.",
    path: ["fonctionAutre"],
  });

const founderSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    dateOfBirth: z.string().min(1, "Date de naissance requise"),
    sex: z.enum(["M", "F"], { message: "Sexe requis" }),
    matriculeManual: z
      .string()
      .regex(MATRICULE_MANUAL_PATTERN, "4 chiffres requis pour le numéro de matricule"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    passwordConfirmation: z.string().min(8, "8 caractères minimum"),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export async function createSchool(
  _prevState: CreateSchoolState | undefined,
  formData: FormData
): Promise<CreateSchoolState> {
  const parsedSchool = schoolSchema.safeParse({
    name: formData.get("name"),
    reseau: formData.get("reseau"),
    region: formData.get("region"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    locality: formData.get("locality"),
    phone: formData.get("phone"),
    numeroFase: formData.get("numeroFase"),
    country: formData.get("country") ?? "",
  });
  if (!parsedSchool.success) {
    return { error: parsedSchool.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const niveaux = niveauSchema.array().safeParse(formData.getAll("niveaux"));
  const typesEnseignement = typeEnseignementSchema.array().safeParse(formData.getAll("typesEnseignement"));
  if (!niveaux.success || !typesEnseignement.success) {
    return { error: "Niveaux ou type d'enseignement invalide." };
  }

  const parsedFounderRole = founderRoleSchema.safeParse({
    fonction: formData.get("fonction"),
    fonctionAutre: formData.get("fonctionAutre") || undefined,
  });
  if (!parsedFounderRole.success) {
    return { error: parsedFounderRole.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const role = parsedFounderRole.data.fonction === "Autre" ? "REFERENT_NUMERIQUE" : "DIRECTION";

  // Validé avant la transaction : un logo invalide ne doit pas laisser un
  // compte/école à moitié créés (cf. saveSchoolLogo, appelé après coup une
  // fois le schoolId disponible).
  const logoFile = formData.get("logoFile");
  const hasLogo = logoFile instanceof File && logoFile.size > 0;
  if (hasLogo) {
    try {
      validateLogoFile(logoFile as File);
    } catch (error) {
      if (error instanceof InvalidLogoError) return { error: error.message };
      throw error;
    }
  }

  const parsedFounder = founderSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
    matriculeManual: formData.get("matriculeManual"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!parsedFounder.success) {
    return { error: parsedFounder.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const email = parsedFounder.data.email.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
  }

  const founderEmail = email;
  const founderPassword = parsedFounder.data.password;
  const passwordHash = await bcrypt.hash(founderPassword, 10);
  const matricule = computeMatricule(
    parsedFounder.data.sex,
    parsedFounder.data.dateOfBirth,
    parsedFounder.data.matriculeManual
  );

  let founderUserId: string;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        firstName: parsedFounder.data.firstName,
        lastName: parsedFounder.data.lastName,
        passwordHash,
        dateOfBirth: new Date(parsedFounder.data.dateOfBirth),
        sex: parsedFounder.data.sex,
        matricule,
      },
    });
    founderUserId = user.id;
  } catch (error) {
    // Filet de sécurité en cas de double-soumission concurrente (le
    // findUnique ci-dessus n'est pas atomique avec la création) — collision
    // possible sur l'email ou, plus rarement, sur le matricule.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("matricule")) {
        return { error: "Ce numéro de matricule est déjà utilisé par un autre compte." };
      }
      return { error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    throw error;
  }

  let school;
  try {
    school = await prisma.$transaction(async (tx) => {
      const createdSchool = await tx.school.create({
        data: {
          name: parsedSchool.data.name,
          reseau: parsedSchool.data.reseau,
          region: parsedSchool.data.region,
          niveaux: niveaux.data,
          typesEnseignement: typesEnseignement.data,
          address: parsedSchool.data.address,
          postalCode: parsedSchool.data.postalCode,
          locality: parsedSchool.data.locality,
          country: parsedSchool.data.country,
          phone: parsedSchool.data.phone,
          numeroFase: parsedSchool.data.numeroFase,
          // Toute école créée via ce flux public attend une validation par
          // la plateforme (app/admin/ecoles) avant de devenir opérationnelle
          // — cf. la garde dans app/(app)/layout.tsx.
          status: "PENDING",
        },
      });

      // Le fondateur devient titulaire du compte (isAccountOwner) — cf.
      // permissions.md : protégé contre le retrait/la rétrogradation par qui
      // que ce soit d'autre que lui-même.
      await tx.membership.create({
        data: {
          userId: founderUserId,
          schoolId: createdSchool.id,
          role,
          fonction: parsedFounderRole.data.fonction,
          fonctionAutre: parsedFounderRole.data.fonction === "Autre" ? parsedFounderRole.data.fonctionAutre : null,
          status: "ACTIVE",
          isAccountOwner: true,
        },
      });

      await createJoinCodeForSchool(tx, createdSchool.id, createdSchool.name, founderUserId);

      return createdSchool;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ce numéro FASE est déjà utilisé par une autre école." };
    }
    throw error;
  }

  // Après coup : le schoolId n'existe qu'une fois la transaction validée
  // (cf. saveSchoolLogo, dont la clé de stockage est dérivée du schoolId).
  // Best effort — un échec ici ne doit pas faire perdre l'école déjà créée.
  if (hasLogo) {
    try {
      const logoUrl = await saveSchoolLogo(school.id, logoFile as File);
      await prisma.school.update({ where: { id: school.id }, data: { logoUrl } });
    } catch {
      // Le logo reste vide ; modifiable depuis les paramètres de l'école.
    }
  }

  await logAudit({
    schoolId: school.id,
    actorId: founderUserId,
    action: AuditAction.CREATE_SCHOOL,
    targetType: "School",
    targetId: school.id,
  });

  // L'école reste PENDING : la plateforme doit savoir qu'une demande attend.
  await notifyPlatformOfNewSchool(school.id, founderUserId);

  try {
    await signIn("credentials", {
      email: founderEmail,
      password: founderPassword,
      redirectTo: "/mes-periodes",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "École créée, mais connexion automatique impossible. Merci de vous connecter." };
    }
    throw error; // laisse passer la redirection interne de signIn en cas de succès
  }
}

export type FwbLookup =
  | { found: false }
  | {
      found: true;
      name: string;
      /// Réseau de la plateforme correspondant, ou null quand l'annuaire n'en
      /// désigne pas d'équivalent (COCOF, organisme public autre).
      reseau: string | null;
      /// Vrai quand ce réseau est une supposition : l'annuaire dit « Libre
      /// confessionnel » sans préciser la confession.
      reseauIncertain: boolean;
      region: string | null;
      address: string | null;
      postalCode: string | null;
      locality: string | null;
      niveaux: string[];
      typesEnseignement: string[];
      implantationCount: number;
      /// Déjà inscrite sur la plateforme : la création échouerait de toute
      /// façon (School.numeroFase est unique), autant le dire tout de suite.
      dejaInscrite: boolean;
    };

/// Recherche une école dans l'annuaire officiel de la FWB (table fwb_schools,
/// alimentée par scripts/importer-cartographie.ts) pour préremplir le
/// formulaire de création.
///
/// Volontairement accessible sans être connecté — c'est la page publique de
/// création d'école qui l'appelle — et sans risque : ces données sont celles
/// d'un fichier ouvert publié par la Fédération. Rien de ce qui touche à la
/// plateforme n'y transite, hormis le fait qu'une école soit déjà inscrite,
/// que le formulaire révélerait de toute façon en refusant le doublon.
export async function lookupFwbSchool(numeroFaseSaisi: string): Promise<FwbLookup> {
  const numeroFase = normaliserFase(numeroFaseSaisi);
  if (!numeroFase || numeroFase.length > 8) return { found: false };

  const [ecole, dejaInscrite] = await Promise.all([
    prisma.fwbSchool.findUnique({ where: { numeroFase } }),
    prisma.school.findUnique({ where: { numeroFase }, select: { id: true } }),
  ]);
  if (!ecole) return { found: false };

  return {
    found: true,
    name: ecole.name,
    reseau: reseauPlateforme(ecole.reseau),
    reseauIncertain: reseauIncertain(ecole.reseau),
    region: regionPlateforme(ecole.bassin),
    address: ecole.address,
    postalCode: ecole.postalCode,
    // Réorthographiée d'après le référentiel des codes postaux : l'annuaire
    // écrit « CHATELET », le menu du formulaire propose « Châtelet ».
    locality: canonicalLocality(ecole.postalCode ?? "", ecole.locality),
    niveaux: ecole.niveaux,
    typesEnseignement: ecole.genres,
    implantationCount: ecole.implantationCount,
    dejaInscrite: dejaInscrite !== null,
  };
}
