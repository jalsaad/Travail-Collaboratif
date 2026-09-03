import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMemberships, resolveActiveMembership } from "@/lib/active-school";
import { Nav } from "@/components/nav";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SchoolApprovalNotice } from "@/components/school-approval-notice";
import { DemoBanner } from "@/components/demo-banner";
import { SchoolLogoBadge } from "@/components/school-logo-badge";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const [memberships, currentUser, schoolYear] = await Promise.all([
    getActiveMemberships(session.userId),
    prisma.user.findUnique({ where: { id: session.userId }, select: { satisfactionRating: true } }),
    getCurrentSchoolYear(),
  ]);
  const active = await resolveActiveMembership(session.userId, memberships);
  // PARTIAL (cercle informel initié par un·e enseignant·e, cf.
  // app/(auth)/rejoindre/actions.ts::initiatePartialSchool) est opérationnelle
  // tout de suite, comme APPROVED — seules PENDING/REJECTED bloquent l'accès.
  const pending = active && active.schoolStatus !== "APPROVED" && active.schoolStatus !== "PARTIAL";

  return (
    <div className="min-h-screen bg-stone-50 pt-4 dark:bg-stone-950">
      {session.isDemo && <DemoBanner />}
      <Nav
        session={session}
        active={active}
        memberships={memberships}
        satisfactionRating={currentUser?.satisfactionRating ?? null}
        schoolYearLabel={schoolYear?.label ?? null}
      />
      {active && <SchoolLogoBadge />}
      {active && !pending && <AnnouncementBanner userId={session.userId} active={active} />}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {pending ? (
          <SchoolApprovalNotice status={active.schoolStatus} schoolName={active.schoolName} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
