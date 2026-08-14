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
// Règle de quota (cf. schema.prisma::AnnualAssignment) : 60 périodes pour un
// temps plein, proportionnellement adaptées en deçà — le vade-mecum annexé à
// la circulaire 7167 prévoit que « l'enseignant qui preste à temps partiel
// voit son volume de travail collaboratif proportionnellement adapté à son
// horaire face à la classe ». Un mi-temps doit donc 30 périodes, pas 15.
//
// Le seuil s'évalue sur l'ETP TOTAL de l'utilisateur (somme sur toutes ses
// écoles), pas école par école, et le total est ensuite réparti entre écoles
// au prorata de l'ETP de chacune.
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

  const totalQuota = 60 * Math.min(totalEtp, 1);

  for (const m of withEtp) {
    // Arrondi à la précision de la colonne Decimal(5,2) : la division par un
    // ETP total non représentable en binaire (0,8 par exemple) produit sinon
    // des valeurs comme 17,999999999999996 au lieu de 18.
    const objectifPeriodes = Math.round(totalQuota * (m.etp / totalEtp) * 100) / 100;
    await prisma.annualAssignment.upsert({
      where: { membershipId_schoolYearId: { membershipId: m.membershipId, schoolYearId } },
      update: { etp: m.etp, objectifPeriodes },
      create: { membershipId: m.membershipId, schoolYearId, etp: m.etp, objectifPeriodes },
    });
  }
}
