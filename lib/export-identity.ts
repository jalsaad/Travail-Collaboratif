import { prisma } from "@/lib/prisma";
import { TEACHING_LEVEL_OPTIONS } from "@/lib/teaching-levels";
import { formatPeriodes } from "@/lib/period-duration";
import { getMembershipProgress, getOtherSchoolsPeriodes } from "@/lib/collaboration-progress";
import type { ExportIdentity } from "@/lib/export-builders";

// Bloc d'identité des relevés individuels, assemblé au même endroit pour les
// deux routes qui en produisent — l'export personnel de l'enseignant et
// l'export ciblé d'une direction — afin qu'un relevé porte les mêmes
// informations d'où qu'il vienne.

const LEVEL_LABEL = new Map(TEACHING_LEVEL_OPTIONS.map((o) => [o.value, o.label]));

export async function buildExportIdentity(
  membershipId: string,
  schoolYearId: string | null
): Promise<ExportIdentity | undefined> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      levelHours: { include: { discipline: { select: { name: true } } } },
    },
  });
  if (!membership) return undefined;

  const teaching =
    membership.levelHours.length > 0
      ? membership.levelHours
          .map(
            (lh) =>
              `${LEVEL_LABEL.get(lh.level) ?? lh.level} — ${lh.discipline.name} (${formatPeriodes(
                lh.hours.toString()
              )} h/sem.)`
          )
          .join(", ")
      : "non renseigné";

  // Sans année scolaire ouverte, aucun compteur n'a de sens : on garde le bloc
  // pour l'identité, avec des totaux à zéro.
  if (!schoolYearId) {
    return {
      fullName: `${membership.user.firstName} ${membership.user.lastName}`,
      matricule: membership.user.matricule ?? "non renseigné",
      teaching,
      done: "0",
      objective: "0",
      otherSchools: null,
      total: "0",
    };
  }

  const [progress, ailleurs] = await Promise.all([
    getMembershipProgress(membershipId, schoolYearId),
    getOtherSchoolsPeriodes(membership.user.id, membershipId, schoolYearId),
  ]);

  return {
    fullName: `${membership.user.firstName} ${membership.user.lastName}`,
    matricule: membership.user.matricule ?? "non renseigné",
    teaching,
    done: formatPeriodes(progress.done),
    objective: formatPeriodes(progress.objective),
    // Omise plutôt qu'affichée à zéro : une personne mono-école ne doit pas
    // lire une ligne suggérant qu'elle aurait dû travailler ailleurs.
    otherSchools: ailleurs > 0 ? formatPeriodes(ailleurs) : null,
    total: formatPeriodes(progress.done + ailleurs),
  };
}
