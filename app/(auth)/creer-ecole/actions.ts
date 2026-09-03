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
  normaliserRecherche,
  regionPlateforme,
  reseauIncertain,
  reseauPlateforme,
} from "@/lib/fwb-directory";
import { canonicalLocality } from "@/lib/belgian-postal-codes";
import { FORM_CREATE_SCHOOL, logFormRejection, logZodRejection } from "@/lib/form-rejections";
import { normalizeWebsite, InvalidWebsiteError } from "@/lib/website-url";

export type CreateSchoolState = { error?: string };

/// Consigne le motif puis rend le message destiné à la personne. Les deux
/// diffèrent parfois : le relevé se passe du « Connectez-vous plutôt » qui
/// n'apprend rien à qui l'analyse.
async function refus(message: string, champ?: string): Promise<string> {
  await logFormRejection(FORM_CREATE_SCHOOL, message, champ);
  return message === "Un compte existe déjà avec cet email."
    ? "Un compte existe déjà avec cet email. Connectez-vous plutôt."
    : message;
}

const schoolSchema = z.object({
  name: z.string().min(1, "Nom de l'école requis"),
  reseau: z.string().min(1, "Réseau d'enseignement requis"),
  region: z.string().min(1, "Région requise"),
  address: z.string().min(1, "Rue et numéro requis"),
  postalCode: z.string().min(1, "Code postal requis"),
  locality: z.string().min(1, "Localité requise"),
  phone: z.string().min(1, "Téléphone requis"),
  /// Facultatif : beaucoup d'écoles n'ont pas de site. `normalizeWebsite`
  /// complète le schéma manquant — « www.ecole.be » saisi tel quel serait
  /// pris pour un chemin relatif par un navigateur.
  website: z
    .string()
    .transform((v, ctx) => {
      try {
        return normalizeWebsite(v);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof InvalidWebsiteError ? error.message : "Adresse du site invalide.",
        });
        return z.NEVER;
      }
    })
    .nullable(),
  // Facultatif : toutes les écoles n'en ont pas (programme belge à
  // l'étranger, implantation absente de l'annuaire...), et l'exiger revenait
  // à leur fermer l'inscription. Reste unique quand il est fourni — Postgres
  // autorise autant de NULL qu'on veut sur une colonne unique, donc plusieurs
  // écoles sans numéro coexistent sans se gêner. Conséquence assumée : sans
  // FASE, l'école ne se rapproche pas de l'annuaire et n'apparaît pas sur la
  // cartographie (cf. le commentaire de FwbSchool dans prisma/schema.prisma).
  numeroFase: z.string().transform((v) => v.trim() || null),
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
//
// Volontairement réservé à la direction : un enseignant qui veut juste
// réunir son petit cercle de collègues passe par son propre formulaire
// d'inscription (app/(auth)/rejoindre/actions.ts::initiatePartialSchool),
// pas par ici — se déclarer "fondateur" d'un espace école, même relabellisé
// Admin, est mal perçu par les directions quand ça vient d'un enseignant.
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
    website: formData.get("website") ?? "",
    numeroFase: formData.get("numeroFase") ?? "",
    country: formData.get("country") ?? "",
  });
  if (!parsedSchool.success) {
    return { error: await logZodRejection(FORM_CREATE_SCHOOL, parsedSchool.error) };
  }

  const niveaux = niveauSchema.array().safeParse(formData.getAll("niveaux"));
  const typesEnseignement = typeEnseignementSchema.array().safeParse(formData.getAll("typesEnseignement"));
  if (!niveaux.success || !typesEnseignement.success) {
    return { error: await refus("Niveaux ou type d'enseignement invalide.", "niveaux") };
  }

  const parsedFounderRole = founderRoleSchema.safeParse({
    fonction: formData.get("fonction"),
    fonctionAutre: formData.get("fonctionAutre") || undefined,
  });
  if (!parsedFounderRole.success) {
    return { error: await logZodRejection(FORM_CREATE_SCHOOL, parsedFounderRole.error) };
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
      if (error instanceof InvalidLogoError) return { error: await refus(error.message, "logoFile") };
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
    return { error: await logZodRejection(FORM_CREATE_SCHOOL, parsedFounder.error) };
  }

  const email = parsedFounder.data.email.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: await refus("Un compte existe déjà avec cet email.", "email") };
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
        return { error: await refus("Ce numéro de matricule est déjà utilisé.", "matricule") };
      }
      return { error: await refus("Un compte existe déjà avec cet email.", "email") };
    }
    throw error;
  }

  // Une école déjà ouverte par ses enseignant·es (statut PARTIAL, cf.
  // initiatePartialSchool) n'est PAS un doublon à refuser : c'est exactement
  // la situation que l'email d'invitation demande à la direction de régler.
  // Elle complète alors le dossier de l'école existante, sans que le cercle
  // déjà constitué ni les périodes déjà déclarées ne soient perdus.
  const cercleExistant = parsedSchool.data.numeroFase
    ? await prisma.school.findUnique({ where: { numeroFase: parsedSchool.data.numeroFase } })
    : null;
  if (cercleExistant && cercleExistant.status !== "PARTIAL") {
    return { error: await refus("Ce numéro FASE est déjà utilisé.", "numeroFase") };
  }

  const donneesEcole = {
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
    website: parsedSchool.data.website,
    numeroFase: parsedSchool.data.numeroFase,
  };

  let school;
  try {
    school = await prisma.$transaction(async (tx) => {
      const ecole = cercleExistant
        ? await tx.school.update({
            where: { id: cercleExistant.id },
            // Le cercle passe APPROVED plutôt que PENDING : il fonctionnait
            // déjà, et l'attente d'une validation plateforme le mettrait à
            // l'arrêt pour des enseignant·es qui n'ont rien demandé (cf. la
            // garde dans app/(app)/layout.tsx). La plateforme est prévenue
            // ci-dessous et garde la main a posteriori.
            data: { ...donneesEcole, status: "APPROVED" },
          })
        : await tx.school.create({
            data: {
              ...donneesEcole,
              // Toute école créée de zéro via ce flux public attend une
              // validation par la plateforme (app/admin/ecoles) avant de
              // devenir opérationnelle — cf. la garde dans app/(app)/layout.tsx.
              status: "PENDING",
            },
          });

      // Le fondateur devient titulaire du compte (isAccountOwner) — cf.
      // permissions.md : protégé contre le retrait/la rétrogradation par qui
      // que ce soit d'autre que lui-même.
      await tx.membership.create({
        data: {
          userId: founderUserId,
          schoolId: ecole.id,
          role,
          fonction: parsedFounderRole.data.fonction,
          fonctionAutre: parsedFounderRole.data.fonction === "Autre" ? parsedFounderRole.data.fonctionAutre : null,
          status: "ACTIVE",
          isAccountOwner: true,
        },
      });

      // Un cercle PARTIAL n'a jamais eu de code de rattachement — personne
      // n'y avait le droit d'en générer un. La direction en obtient un ici,
      // en même temps que ses droits de gestion.
      await createJoinCodeForSchool(tx, ecole.id, ecole.name, founderUserId);

      return ecole;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: await refus("Ce numéro FASE est déjà utilisé.", "numeroFase") };
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
    // Distinguer la reprise d'un cercle d'une création de zéro : ce n'est
    // pas le même événement, et le journal sert précisément à le retracer.
    action: cercleExistant ? AuditAction.COMPLETE_PARTIAL_SCHOOL : AuditAction.CREATE_SCHOOL,
    targetType: "School",
    targetId: school.id,
  });

  // Création de zéro : l'école attend une validation, la plateforme doit le
  // savoir. Reprise d'un cercle : elle est déjà opérationnelle, mais la
  // plateforme doit pouvoir vérifier a posteriori qui s'en est déclaré
  // direction.
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
      /// Cercle ouvert par des enseignant·es (statut PARTIAL) : ce n'est PAS
      /// un doublon à refuser, la direction est au contraire invitée à
      /// compléter le dossier — l'école existante est alors reprise, cercle
      /// et périodes compris (cf. createSchool).
      cercleAComplecter: boolean;
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

  const [ecole, inscrite] = await Promise.all([
    prisma.fwbSchool.findUnique({ where: { numeroFase } }),
    prisma.school.findUnique({ where: { numeroFase }, select: { id: true, status: true } }),
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
    dejaInscrite: inscrite !== null,
    cercleAComplecter: inscrite?.status === "PARTIAL",
  };
}

export type FwbSchoolSuggestion = {
  numeroFase: string;
  name: string;
  locality: string | null;
  postalCode: string | null;
};

/// Recherche par nom dans l'annuaire de la FWB — le numéro FASE n'est
/// généralement pas connu des enseignants, contrairement au nom de leur
/// école. Utilisée pour préremplir `numeroFase` via un choix dans une liste
/// plutôt qu'une saisie à l'aveugle (cf. components/school-name-search.tsx),
/// avant de retomber sur lookupFwbSchool pour le préremplissage complet.
///
/// Même table, même recherche par sous-chaîne sur `searchKey` déjà normalisée
/// que app/admin/cartographie/page.tsx — pas de nouvelle extension Postgres.
export async function searchFwbSchoolsByName(query: string): Promise<FwbSchoolSuggestion[]> {
  const terme = normaliserRecherche(query);
  if (terme.length < 2) return [];

  const ecoles = await prisma.fwbSchool.findMany({
    where: { searchKey: { contains: terme } },
    select: { numeroFase: true, name: true, locality: true, postalCode: true },
    orderBy: { name: "asc" },
    take: 10,
  });
  return ecoles;
}
