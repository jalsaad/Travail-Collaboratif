"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clearActiveSchoolCookie, setActiveSchoolCookie } from "@/lib/active-school";
import { demoErrorState, tolerateDemoWrite } from "@/lib/demo-mode";
import { privacyAcceptanceRecord } from "@/lib/privacy-policy";
import { assertCanLeaveSchool, ForbiddenError } from "@/lib/school-authorization";
import { AuditAction, logAudit } from "@/lib/audit-log";
import { notifySchoolDirectionOfDeparture } from "@/lib/school-notifications";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function switchSchool(schoolId: string) {
  const session = await auth();
  if (!session) return;

  await setActiveSchoolCookie(schoolId, session.userId);
  revalidatePath("/", "layout");
}

export type LeaveSchoolState = { error?: string; success?: string };

// Départ volontaire d'une école. Le rattachement passe à REMOVED et conserve
// son horodatage : exactement ce que fait déjà un retrait décidé par la
// direction (cf. app/(app)/ecole/membres/actions.ts::removeMember).
//
// RIEN N'EST EFFACÉ, et c'est délibéré. Les périodes déclarées restent au
// dossier de l'école — elle en a besoin pour sa justification annuelle, et
// les collègues qui ont nommé cette personne dans leurs propres déclarations
// verraient sinon la leur amputée (même principe qu'en
// lib/account-deletion.ts).
//
// LE RETOUR RESTE OUVERT : la contrainte @@unique([userId, schoolId]) garantit
// une seule ligne par couple, pour toujours. Qui est réaffectée dans cette
// école y revient par le code de rattachement, et c'est CETTE ligne qui est
// réactivée (cf. app/(app)/rejoindre-ecole/actions.ts) — l'historique revient
// avec elle. Un départ ne ferme donc jamais la porte.
async function leaveSchoolImpl(
  _prevState: LeaveSchoolState | undefined,
  formData: FormData
): Promise<LeaveSchoolState> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié.");

  const schoolId = String(formData.get("schoolId") ?? "").trim();
  if (!schoolId) return { error: "École introuvable." };

  let membership;
  try {
    membership = await assertCanLeaveSchool(session.userId, schoolId);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { status: "REMOVED", removedAt: new Date() },
  });

  await logAudit({
    schoolId,
    actorId: session.userId,
    action: AuditAction.LEAVE_SCHOOL,
    targetType: "Membership",
    targetId: membership.id,
    metadata: { selfInitiated: true },
  });

  // La direction est prévenue : un départ silencieux fausserait son suivi des
  // effectifs. Ne lève jamais — l'email raté ne doit pas faire échouer un
  // départ pourtant enregistré.
  await notifySchoolDirectionOfDeparture(membership.id);

  await clearActiveSchoolCookie();
  revalidatePath("/", "layout");
  return { success: "Vous avez quitté cette école." };
}

export async function leaveSchool(
  prevState: LeaveSchoolState | undefined,
  formData: FormData
): Promise<LeaveSchoolState> {
  try {
    return await leaveSchoolImpl(prevState, formData);
  } catch (error) {
    const demo = demoErrorState(error);
    if (demo) return demo;
    throw error;
  }
}

export async function dismissAnnouncement(announcementId: string) {
  const session = await auth();
  if (!session) return;

  // Fermer une annonce est un confort d'affichage : en démonstration, le
  // bandeau se referme sans que rien ne soit retenu.
  await tolerateDemoWrite(() =>
    prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId: session.userId } },
      update: { dismissedAt: new Date() },
      create: { announcementId, userId: session.userId, dismissedAt: new Date() },
    })
  );

  revalidatePath("/", "layout");
}

// Prise de connaissance de la politique de confidentialité par un compte
// inscrit avant son introduction (ou avant sa dernière version) : même trace
// que pour une inscription (cf. lib/privacy-policy.ts).
export async function acknowledgePrivacyPolicy() {
  const session = await auth();
  if (!session || session.isDemo) return;

  await prisma.user.update({
    where: { id: session.userId },
    data: privacyAcceptanceRecord(),
  });

  revalidatePath("/", "layout");
}

// Une seule note "courante" par compte (pas un historique) : reclique à tout
// moment pour changer d'avis, cf. components/satisfaction-stars.tsx.
export async function setSatisfactionRating(rating: number) {
  const session = await auth();
  if (!session) return;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  await tolerateDemoWrite(() =>
    prisma.user.update({
      where: { id: session.userId },
      data: { satisfactionRating: rating, satisfactionRatedAt: new Date() },
    })
  );
}
