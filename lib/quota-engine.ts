import { prisma } from "@/lib/prisma";
import { FULL_TIME_HOURS } from "@/lib/teaching-levels";
import type { TeachingLevel } from "@prisma/client";

export function computeMembershipEtp(levels: { level: TeachingLevel; hours: number }[]): number {
  return levels.reduce((sum, l) => sum + l.hours / FULL_TIME_HOURS[l.level], 0);
}

// Recalcule l'ETP et le quota annuel (objectifPeriodes) de TOUTES les
// memberships actives de cet utilisateur qui ont au moins une
// MembershipLevelHours déclarée — ne touche jamais une Membership sans
// déclaration (ex: fondateur DIRECTION/REFERENT_NUMERIQUE via /creer-ecole),
// pour ne pas écraser une donnée hors du périmètre de cette fonctionnalité.
//
// Règle de quota (cf. schema.prisma::AnnualAssignment) : le seuil temps
// plein/partiel s'évalue sur l'ETP TOTAL de l'utilisateur (somme sur toutes
// ses écoles), pas école par école — total >= 1 => 60 périodes, sinon
// 30 * total. Ce total est ensuite réparti entre écoles au prorata de l'ETP
// de chacune.
export async function recomputeUserQuotas(userId: string, schoolYearId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { levelHours: true },
  });

  const withEtp = memberships
    .filter((m) => m.levelHours.length > 0)
    .map((m) => ({
      membershipId: m.id,
      etp: computeMembershipEtp(m.levelHours.map((lh) => ({ level: lh.level, hours: Number(lh.hours) }))),
    }));

  const totalEtp = withEtp.reduce((sum, m) => sum + m.etp, 0);
  if (totalEtp <= 0) return;

  const totalQuota = totalEtp >= 1 ? 60 : 30 * totalEtp;

  for (const m of withEtp) {
    const objectifPeriodes = totalQuota * (m.etp / totalEtp);
    await prisma.annualAssignment.upsert({
      where: { membershipId_schoolYearId: { membershipId: m.membershipId, schoolYearId } },
      update: { etp: m.etp, objectifPeriodes },
      create: { membershipId: m.membershipId, schoolYearId, etp: m.etp, objectifPeriodes },
    });
  }
}
