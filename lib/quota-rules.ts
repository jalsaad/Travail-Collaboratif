// Règle de quota, sans accès à la base : importable par les scripts comme par
// l'application (lib/quota-engine.ts pour les versions qui lisent et écrivent).
import type { TeachingLevel } from "@prisma/client";
import { FULL_TIME_HOURS } from "@/lib/teaching-levels";

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
