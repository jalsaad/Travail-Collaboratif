"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveSchoolCookie } from "@/lib/active-school";

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

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: session.userId } },
    update: { dismissedAt: new Date() },
    create: { announcementId, userId: session.userId, dismissedAt: new Date() },
  });

  revalidatePath("/", "layout");
}

// Une seule note "courante" par compte (pas un historique) : reclique à tout
// moment pour changer d'avis, cf. components/satisfaction-stars.tsx.
export async function setSatisfactionRating(rating: number) {
  const session = await auth();
  if (!session) return;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  await prisma.user.update({
    where: { id: session.userId },
    data: { satisfactionRating: rating, satisfactionRatedAt: new Date() },
  });
}
