import { prisma } from "@/lib/prisma";
import { FULL_TIME_HOURS } from "@/lib/teaching-levels";
import type { TeachingLevel } from "@prisma/client";

export function computeMembershipEtp(levels: { level: TeachingLevel; hours: number }[]): number {
  return levels.reduce((sum, l) => sum + l.hours / FULL_TIME_HOURS[l.level], 0);
}

/// Quota d'une personne, rattachement par rattachement.
export type QuotaTarget = { membershipId: string; etp: number; objectifPeriodes: number };

/// Règle de quota (cf. schema.prisma::AnnualAssignment) : 60 périodes pour un
/// temps plein, proportionnellement adaptées en deçà — le vade-mecum annexé à
/// la circulaire 7167 prévoit que « l'enseignant qui preste à temps partiel
/// voit son volume de travail collaboratif proportionnellement adapté à son
/// horaire face à la classe ». Un mi-temps doit donc 30 périodes, pas 15.
///
/// Le seuil s'évalue sur l'ETP TOTAL de la personne (somme sur toutes ses
/// écoles), pas école par école, et le total est ensuite réparti entre écoles
/// au prorata de l'ETP de chacune.
///
/// Fonction pure : sert à l'écriture (recomputeUserQuotas) comme à la lecture
/// (lib/collaboration-progress.ts, quand la ligne annuelle manque encore).
export function quotaTargetsFor(
  memberships: { id: string; levelHours: { level: TeachingLevel; hours: number }[] }[]
): QuotaTarget[] {
  const withEtp = memberships
    .filter((m) => m.levelHours.length > 0)
    .map((m) => ({ membershipId: m.id, etp: computeMembershipEtp(m.levelHours) }));

  const totalEtp = withEtp.reduce((sum, m) => sum + m.etp, 0);
  if (totalEtp <= 0) return [];

  const totalQuota = 60 * Math.min(totalEtp, 1);

  return withEtp.map((m) => ({
    membershipId: m.membershipId,
    etp: m.etp,
    // Arrondi à la précision de la colonne Decimal(5,2) : la division par un
    // ETP total non représentable en binaire (0,8 par exemple) produit sinon
    // des valeurs comme 17,999999999999996 au lieu de 18.
    objectifPeriodes: Math.round(totalQuota * (m.etp / totalEtp) * 100) / 100,
  }));
}

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
