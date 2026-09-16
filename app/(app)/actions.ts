"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveSchoolCookie } from "@/lib/active-school";
import { tolerateDemoWrite } from "@/lib/demo-mode";
import { privacyAcceptanceRecord } from "@/lib/privacy-policy";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function switchSchool(schoolId: string) {
  const session = await auth();
  if (!session) return;

  await setActiveSchoolCookie(schoolId, session.userId);
  revalidatePath("/", "layout");
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
