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
