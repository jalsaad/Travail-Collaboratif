import { prisma } from "@/lib/prisma";
import type { ActiveMembership } from "@/lib/active-school";

// Une annonce est visible si AU MOINS UNE de ses lignes de ciblage (OU) a
// TOUS ses critères renseignés (ET) qui correspondent à la membership active
// de l'utilisateur — cf. permissions.md > "Service annonces (ciblage)".
export async function getVisibleAnnouncementsForUser(userId: string, active: ActiveMembership) {
  const now = new Date();

  const [school, disciplines, reads, announcements] = await Promise.all([
    prisma.school.findUnique({ where: { id: active.schoolId } }),
    prisma.membershipDiscipline.findMany({
      where: { membershipId: active.membershipId },
      select: { disciplineId: true },
    }),
    prisma.announcementRead.findMany({
      where: { userId },
      select: { announcementId: true },
    }),
    prisma.announcement.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ publishAt: null }, { publishAt: { lte: now } }],
        // NULL SQL : "expiresAt <= now" est indéterminé (donc exclu par le
        // WHERE) quand expiresAt est NULL — il faut l'expliciter en OR,
        // jamais un NOT sur une comparaison qui peut porter sur NULL.
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      include: { targets: true, media: true },
      orderBy: { publishAt: "desc" },
    }),
  ]);

  const disciplineIds = new Set(disciplines.map((d) => d.disciplineId));
  const readIds = new Set(reads.map((r) => r.announcementId));

  return announcements.filter((announcement) => {
    if (readIds.has(announcement.id)) return false;
    return announcement.targets.some((target) => {
      if (target.role && target.role !== active.role) return false;
      if (target.schoolId && target.schoolId !== active.schoolId) return false;
      if (target.reseau && target.reseau !== school?.reseau) return false;
      if (target.disciplineId && !disciplineIds.has(target.disciplineId)) return false;
      return true;
    });
  });
}
