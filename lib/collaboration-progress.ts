import { prisma } from "@/lib/prisma";

// Objectif par défaut si aucune AnnualAssignment n'existe encore pour la
// personne sur l'année scolaire courante — équivalent temps plein (cf.
// commentaire de School.AnnualAssignment dans schema.prisma : 60 * etp).
const DEFAULT_OBJECTIVE = 60;

export type TeacherProgress = {
  membershipId: string;
  name: string;
  done: number;
  objective: number;
  percent: number;
  /// Périodes déclarées par cette personne dans ses AUTRES écoles, agrégées
  /// (cf. getOtherSchoolsPeriodes). 0 si elle n'enseigne qu'ici.
  otherSchools: number;
};

function computePercent(done: number, objective: number): number {
  return objective > 0 ? (done / objective) * 100 : 0;
}

// Toutes les périodes déclarées où la personne est participante comptent,
// quel que soit leur statut de confirmation — décision explicite de
// l'utilisateur : reflète l'effort déclaré, pas seulement le validé (cf. plan).
export async function getSchoolTeachersProgress(
  schoolId: string,
  schoolYearId: string
): Promise<TeacherProgress[]> {
  const teachers = await prisma.membership.findMany({
    where: { schoolId, status: "ACTIVE", role: "ENSEIGNANT" },
    include: {
      user: { select: { firstName: true, lastName: true } },
      annualAssignments: { where: { schoolYearId } },
      periodParticipants: {
        where: { period: { schoolYearId } },
        include: { period: { select: { dureePeriodes: true } } },
      },
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });

  // Une seule requête pour toute l'école plutôt qu'une par enseignant : les
  // participations de ces personnes rattachées à une membership qui n'est pas
  // de cette école, donc faites ailleurs.
  const membershipIds = teachers.map((t) => t.id);
  const elsewhere = await prisma.periodParticipant.findMany({
    where: {
      userId: { in: teachers.map((t) => t.userId) },
      membershipId: { notIn: membershipIds },
      period: { schoolYearId },
    },
    include: { period: { select: { dureePeriodes: true } } },
  });
  const elsewhereByUser = new Map<string, number>();
  for (const pp of elsewhere) {
    elsewhereByUser.set(
      pp.userId,
      (elsewhereByUser.get(pp.userId) ?? 0) + Number(pp.period.dureePeriodes)
    );
  }

  return teachers.map((teacher) => {
    const objective = Number(teacher.annualAssignments[0]?.objectifPeriodes ?? DEFAULT_OBJECTIVE);
    const done = teacher.periodParticipants.reduce(
      (sum, pp) => sum + Number(pp.period.dureePeriodes),
      0
    );
    return {
      membershipId: teacher.id,
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      done,
      objective,
      percent: computePercent(done, objective),
      otherSchools: elsewhereByUser.get(teacher.userId) ?? 0,
    };
  });
}

export async function getMembershipProgress(
  membershipId: string,
  schoolYearId: string
): Promise<{ done: number; objective: number; percent: number }> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      annualAssignments: { where: { schoolYearId } },
      periodParticipants: {
        where: { period: { schoolYearId } },
        include: { period: { select: { dureePeriodes: true } } },
      },
    },
  });

  const objective = Number(membership?.annualAssignments[0]?.objectifPeriodes ?? DEFAULT_OBJECTIVE);
  const done =
    membership?.periodParticipants.reduce((sum, pp) => sum + Number(pp.period.dureePeriodes), 0) ?? 0;

  return { done, objective, percent: computePercent(done, objective) };
}

/// Périodes que la personne a déclarées AILLEURS que dans l'école visée, sur
/// l'année en cours — un total agrégé, sans nom d'établissement ni détail des
/// périodes.
///
/// C'est un écart assumé au cloisonnement inter-écoles de permissions.md, qui
/// veut qu'une direction ne voie que les lignes de participation de son propre
/// personnel. Deux raisons le justifient : le quota annuel est déjà calculé
/// sur l'ETP TOTAL toutes écoles confondues puis réparti au prorata (cf.
/// lib/quota-engine.ts), donc l'objectif affiché dépend déjà des autres
/// écoles ; et une direction doit pouvoir constater si l'obligation globale
/// des 60 périodes est remplie. L'agrégat s'arrête là : ni le nom des écoles,
/// ni les périodes elles-mêmes ne sont exposés.
export async function getOtherSchoolsPeriodes(
  userId: string,
  membershipId: string,
  schoolYearId: string
): Promise<number> {
  const elsewhere = await prisma.periodParticipant.findMany({
    where: {
      userId,
      membershipId: { not: membershipId },
      period: { schoolYearId },
    },
    include: { period: { select: { dureePeriodes: true } } },
  });

  return elsewhere.reduce((sum, pp) => sum + Number(pp.period.dureePeriodes), 0);
}
