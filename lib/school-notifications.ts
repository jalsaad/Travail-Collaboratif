import { prisma } from "@/lib/prisma";
import { TEACHING_LEVEL_OPTIONS } from "@/lib/teaching-levels";
import {
  getBaseUrl,
  sendNewMemberNotification,
  sendNewSchoolNotification,
  sendTeacherReminderEmail,
} from "@/lib/mailer";
import { civilityAndLastName } from "@/lib/civility";

// Notifications déclenchées par un rattachement ou une inscription d'école.
//
// Même parti pris que lib/participation-invitations.ts : ces envois ne
// doivent JAMAIS faire échouer l'action qui les déclenche. Un enseignant ne
// perd pas son rattachement parce que le serveur SMTP est injoignable —
// l'erreur est journalisée, rien de plus.

const LEVEL_LABEL = new Map(TEACHING_LEVEL_OPTIONS.map((o) => [o.value, o.label]));

/// "Primaire — Mathématiques (12 h), Secondaire inférieur — Français (6 h)"
function summarizeTeaching(
  levels: { level: string; hours: unknown; discipline: { name: string } }[]
): string {
  if (levels.length === 0) return "non renseigné";
  return levels
    .map((l) => `${LEVEL_LABEL.get(l.level as never) ?? l.level} — ${l.discipline.name} (${l.hours} h)`)
    .join(", ");
}

/// Prévient la direction et les référent·es numériques de l'école qu'un
/// enseignant vient de s'y rattacher. Ces deux rôles sont ceux qui gèrent
/// l'établissement (cf. lib/school-authorization.ts::assertCanManageSchool),
/// donc ceux qui doivent surveiller les arrivées.
export async function notifySchoolDirectionOfNewMember(membershipId: string): Promise<void> {
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        school: { select: { id: true, name: true } },
        levelHours: { include: { discipline: { select: { name: true } } } },
      },
    });
    if (!membership) return;

    const managers = await prisma.membership.findMany({
      where: {
        schoolId: membership.schoolId,
        status: "ACTIVE",
        role: { in: ["DIRECTION", "REFERENT_NUMERIQUE"] },
        // Ne jamais s'auto-notifier : sans garde, un référent qui rejoint une
        // seconde école recevrait son propre email s'il y gère déjà.
        id: { not: membership.id },
      },
      include: { user: { select: { email: true } } },
    });

    const to = [...new Set(managers.map((m) => m.user.email))];
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendNewMemberNotification({
      to,
      memberName: `${membership.user.firstName} ${membership.user.lastName}`,
      memberEmail: membership.user.email,
      schoolName: membership.school.name,
      teachingSummary: summarizeTeaching(membership.levelHours),
      joinedAtLabel: membership.joinedAt.toLocaleDateString("fr-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      membersUrl: `${baseUrl}/ecole/membres`,
    });
  } catch (error) {
    console.error(`[rattachement] Échec de notification pour ${membershipId} :`, error);
  }
}

/// Prévient la plateforme qu'une école vient d'être inscrite et attend une
/// validation (cf. SchoolStatus.PENDING).
export async function notifyPlatformOfNewSchool(
  schoolId: string,
  founderUserId: string
): Promise<void> {
  try {
    const [school, founder] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.membership.findFirst({
        where: { schoolId, userId: founderUserId },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);
    if (!school || !founder) return;

    const baseUrl = await getBaseUrl();
    await sendNewSchoolNotification({
      schoolName: school.name,
      numeroFase: school.numeroFase,
      reseau: school.reseau,
      locality: school.postalCode ? `${school.postalCode} ${school.locality ?? ""}`.trim() : school.locality,
      founderName: `${founder.user.firstName} ${founder.user.lastName}`,
      founderEmail: founder.user.email,
      founderFonction:
        founder.fonction === "Autre" ? founder.fonctionAutre ?? "Autre" : founder.fonction,
      adminUrl: `${baseUrl}/admin/ecoles`,
    });
  } catch (error) {
    console.error(`[inscription école] Échec de notification pour ${schoolId} :`, error);
  }
}

/// Prévient par email les enseignant·es d'une école qu'un rappel de remise a
/// été publié, avec le décompte des jours restants.
///
/// Le rappel s'affiche déjà dans l'application, mais rien ne garantit qu'ils
/// s'y connectent avant l'échéance — c'est précisément l'objet d'un rappel.
export async function notifyTeachersOfReminder(params: {
  schoolId: string;
  senderUserId: string;
  message: string;
  daysLeft: number;
  expiresAt: Date;
}): Promise<void> {
  try {
    const { schoolId, senderUserId, message, daysLeft, expiresAt } = params;

    const [school, sender, teachers] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
      prisma.user.findUnique({
        where: { id: senderUserId },
        select: { firstName: true, lastName: true, sex: true },
      }),
      // Exactement la cible de l'annonce (cf. AnnouncementTarget créé par
      // publishTeacherReminder) : les enseignant·es actives de CETTE école.
      prisma.membership.findMany({
        where: { schoolId, status: "ACTIVE", role: "ENSEIGNANT" },
        include: { user: { select: { email: true } } },
      }),
    ]);
    if (!school || !sender) return;

    const recipients = [...new Set(teachers.map((t) => t.user.email))];
    if (recipients.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendTeacherReminderEmail({
      recipients,
      schoolName: school.name,
      senderCivility: civilityAndLastName(sender),
      message,
      daysLeft,
      deadlineLabel: expiresAt.toLocaleDateString("fr-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      periodsUrl: `${baseUrl}/mes-periodes`,
    });
  } catch (error) {
    console.error(`[rappel] Échec de notification pour l'école ${params.schoolId} :`, error);
  }
}
