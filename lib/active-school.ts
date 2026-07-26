import { cookies } from "next/headers";
import type { Role, SchoolStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "active-school-id";

export type ActiveMembership = {
  membershipId: string;
  schoolId: string;
  schoolName: string;
  schoolLogoUrl: string | null;
  role: Role;
  schoolStatus: SchoolStatus;
};

// Toujours interrogée fraîche en base — jamais mise en cache dans la session
// (JWT), qui est un instantané pris à la connexion et peut devenir périmé
// (changement de rôle, retrait, ou nouveau rattachement ajouté en cours de
// session). Même principe que lib/school-authorization.ts pour les droits.
export async function getActiveMemberships(userId: string): Promise<ActiveMembership[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { school: true },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({
    membershipId: m.id,
    schoolId: m.schoolId,
    schoolName: m.school.name,
    schoolLogoUrl: m.school.logoUrl,
    role: m.role,
    schoolStatus: m.school.status,
  }));
}

export async function resolveActiveMembership(
  userId: string,
  preloadedMemberships?: ActiveMembership[]
): Promise<ActiveMembership | null> {
  const memberships = preloadedMemberships ?? (await getActiveMemberships(userId));
  const cookieStore = await cookies();
  const requestedSchoolId = cookieStore.get(COOKIE_NAME)?.value;
  const match = memberships.find((m) => m.schoolId === requestedSchoolId);
  return match ?? memberships[0] ?? null;
}

export async function setActiveSchoolCookie(schoolId: string, userId: string) {
  const memberships = await getActiveMemberships(userId);
  const allowed = memberships.some((m) => m.schoolId === schoolId);
  if (!allowed) throw new Error("École non autorisée pour cet utilisateur.");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, schoolId, { httpOnly: true, sameSite: "lax", path: "/" });
}
