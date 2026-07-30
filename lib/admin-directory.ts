import { prisma } from "@/lib/prisma";
import type { SchoolLevel, EducationType } from "@prisma/client";
import { roleLabel } from "@/lib/role-labels";
import type { DirectoryRow } from "@/lib/admin-directory-export";

export const NIVEAU_LABEL: Record<SchoolLevel, string> = {
  MATERNELLE: "Maternelle",
  PRIMAIRE: "Primaire",
  SECONDAIRE: "Secondaire",
};

export const TYPE_ENSEIGNEMENT_LABEL: Record<EducationType, string> = {
  ORDINAIRE: "Ordinaire",
  SPECIALISE: "Spécialisé",
};

const VALID_NIVEAUX = new Set<string>(Object.keys(NIVEAU_LABEL));
const VALID_TYPES_ENSEIGNEMENT = new Set<string>(Object.keys(TYPE_ENSEIGNEMENT_LABEL));

const SCHOOL_STATUS_LABEL: Record<string, string> = {
  PENDING: "École en attente",
  APPROVED: "Actif",
  REJECTED: "École refusée",
};

export type DirectoryFilters = {
  schoolId?: string;
  reseau?: string;
  region?: string;
  niveau: SchoolLevel[];
  typeEnseignement: EducationType[];
  disciplineId?: string;
};

export function parseDirectoryFilters(searchParams: URLSearchParams): DirectoryFilters {
  return {
    schoolId: searchParams.get("schoolId") || undefined,
    reseau: searchParams.get("reseau") || undefined,
    region: searchParams.get("region") || undefined,
    niveau: searchParams.getAll("niveau").filter((v): v is SchoolLevel => VALID_NIVEAUX.has(v)),
    typeEnseignement: searchParams
      .getAll("typeEnseignement")
      .filter((v): v is EducationType => VALID_TYPES_ENSEIGNEMENT.has(v)),
    disciplineId: searchParams.get("disciplineId") || undefined,
  };
}

// Résolu via une requête School séparée plutôt qu'un filtre de relation
// imbriqué sur Membership : évite l'ambiguïté de typage Prisma entre
// "SchoolWhereInput" et "SchoolScalarRelationFilter" sur une relation
// obligatoire, et reste simple à lire.
async function resolveSchoolIds(filters: DirectoryFilters): Promise<string[] | undefined> {
  const hasSchoolFilter =
    filters.schoolId || filters.reseau || filters.region || filters.niveau.length || filters.typeEnseignement.length;
  if (!hasSchoolFilter) return undefined;

  const schools = await prisma.school.findMany({
    where: {
      ...(filters.schoolId ? { id: filters.schoolId } : {}),
      ...(filters.reseau ? { reseau: filters.reseau } : {}),
      ...(filters.region ? { region: filters.region } : {}),
      ...(filters.niveau.length ? { niveaux: { hasSome: filters.niveau } } : {}),
      ...(filters.typeEnseignement.length ? { typesEnseignement: { hasSome: filters.typeEnseignement } } : {}),
    },
    select: { id: true },
  });
  return schools.map((s) => s.id);
}

// Réutilisé tel quel par la page (pour l'affichage paginé) et par la route
// d'export (sans pagination) — les deux doivent voir exactement le même
// sous-ensemble filtré, cf. plan.
async function buildWhere(filters: DirectoryFilters) {
  const schoolIds = await resolveSchoolIds(filters);
  return {
    status: "ACTIVE" as const,
    ...(schoolIds !== undefined ? { schoolId: { in: schoolIds } } : {}),
    ...(filters.disciplineId ? { levelHours: { some: { disciplineId: filters.disciplineId } } } : {}),
  };
}

// Étend DirectoryRow avec l'évaluation de satisfaction — hors du système
// générique de colonnes (ADMIN_DIRECTORY_COLUMNS/export CSV) puisqu'un rendu
// d'étoiles n'a pas de forme texte naturelle : affiché uniquement à l'écran
// dans app/admin/utilisateurs/page.tsx, jamais exporté.
export type DirectoryRowWithSatisfaction = DirectoryRow & { satisfactionRating: number | null };

async function membershipsToRows(
  memberships: Awaited<ReturnType<typeof fetchMemberships>>
): Promise<DirectoryRowWithSatisfaction[]> {
  const schoolIds = [...new Set(memberships.map((m) => m.schoolId))];
  const activeJoinCodes = await prisma.joinCode.findMany({
    where: { schoolId: { in: schoolIds }, active: true },
  });
  const joinCodeBySchool = new Map(activeJoinCodes.map((jc) => [jc.schoolId, jc.code]));

  return memberships.map((m) => ({
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    email: m.user.email,
    matricule: m.user.matricule ?? "",
    sex: m.user.sex ?? "",
    dateOfBirth: m.user.dateOfBirth ? m.user.dateOfBirth.toISOString().slice(0, 10) : "",
    schoolName: m.school.name,
    joinCode: joinCodeBySchool.get(m.schoolId) ?? "",
    reseau: m.school.reseau ?? "",
    region: m.school.region ?? "",
    niveaux: m.school.niveaux.map((n) => NIVEAU_LABEL[n] ?? n).join(", "),
    typesEnseignement: m.school.typesEnseignement.map((t) => TYPE_ENSEIGNEMENT_LABEL[t] ?? t).join(", "),
    role: roleLabel[m.role],
    disciplines: [...new Set(m.levelHours.map((lh) => lh.discipline.name))].join(", "),
    status: SCHOOL_STATUS_LABEL[m.school.status] ?? m.school.status,
    satisfactionRating: m.user.satisfactionRating,
  }));
}

function fetchMemberships(
  where: Awaited<ReturnType<typeof buildWhere>>,
  pagination?: { skip: number; take: number }
) {
  return prisma.membership.findMany({
    where,
    include: { user: true, school: true, levelHours: { include: { discipline: true } } },
    orderBy: [{ school: { name: "asc" } }, { user: { lastName: "asc" } }],
    skip: pagination?.skip,
    take: pagination?.take,
  });
}

export async function queryDirectoryPage(filters: DirectoryFilters, page: number, pageSize: number) {
  const where = await buildWhere(filters);
  const [memberships, total] = await Promise.all([
    fetchMemberships(where, { skip: (page - 1) * pageSize, take: pageSize }),
    prisma.membership.count({ where }),
  ]);
  return { rows: await membershipsToRows(memberships), total };
}

export async function queryDirectoryAll(filters: DirectoryFilters): Promise<DirectoryRowWithSatisfaction[]> {
  const where = await buildWhere(filters);
  const memberships = await fetchMemberships(where);
  return membershipsToRows(memberships);
}
