import { prisma } from "@/lib/prisma";
import type { TeachingLevel } from "@prisma/client";
import { computeMembershipEtp, quotaTargetsFor, type QuotaTarget } from "@/lib/quota-rules";

export { computeMembershipEtp, quotaTargetsFor };
export type { QuotaTarget };

/// Quotas théoriques des rattachements actifs de ces personnes, sans rien
/// écrire. Une seule requête pour tout le monde : l'appelant en a besoin pour
/// une école entière (cf. getSchoolTeachersProgress), et les heures des AUTRES
/// écoles comptent dans le calcul, puisque le seuil porte sur l'ETP total.
export async function quotaTargetsForUsers(userIds: string[]): Promise<Map<string, QuotaTarget>> {
  const cibles = new Map<string, QuotaTarget>();
  if (userIds.length === 0) return cibles;

  const memberships = await prisma.membership.findMany({
    where: { userId: { in: userIds }, status: "ACTIVE" },
    include: { levelHours: true },
  });

  const parUtilisateur = new Map<string, typeof memberships>();
  for (const m of memberships) {
    const liste = parUtilisateur.get(m.userId) ?? [];
    liste.push(m);
    parUtilisateur.set(m.userId, liste);
  }

  for (const liste of parUtilisateur.values()) {
    const targets = quotaTargetsFor(
      liste.map((m) => ({
        id: m.id,
        levelHours: m.levelHours.map((lh) => ({ level: lh.level, hours: Number(lh.hours) })),
      }))
    );
    for (const t of targets) cibles.set(t.membershipId, t);
  }

  return cibles;
}

// Recalcule l'ETP et le quota annuel (objectifPeriodes) de TOUTES les
// memberships actives de cet utilisateur qui ont au moins une
// MembershipLevelHours déclarée — ne touche jamais une Membership sans
// déclaration (ex: fondateur DIRECTION/REFERENT_NUMERIQUE via /creer-ecole),
// pour ne pas écraser une donnée hors du périmètre de cette fonctionnalité.
export async function recomputeUserQuotas(userId: string, schoolYearId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { levelHours: true },
  });

  const targets = quotaTargetsFor(
    memberships.map((m) => ({
      id: m.id,
      levelHours: m.levelHours.map((lh) => ({ level: lh.level, hours: Number(lh.hours) })),
    }))
  );

  for (const t of targets) {
    await prisma.annualAssignment.upsert({
      where: { membershipId_schoolYearId: { membershipId: t.membershipId, schoolYearId } },
      update: { etp: t.etp, objectifPeriodes: t.objectifPeriodes },
      create: {
        membershipId: t.membershipId,
        schoolYearId,
        etp: t.etp,
        objectifPeriodes: t.objectifPeriodes,
      },
    });
  }
}
