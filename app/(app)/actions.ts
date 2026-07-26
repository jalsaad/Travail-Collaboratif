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
