import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveMemberships, resolveActiveMembership } from "@/lib/active-school";
import { Nav } from "@/components/nav";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SchoolApprovalNotice } from "@/components/school-approval-notice";
import { SchoolLogoBadge } from "@/components/school-logo-badge";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const memberships = await getActiveMemberships(session.userId);
  const active = await resolveActiveMembership(session.userId, memberships);
  const pending = active && active.schoolStatus !== "APPROVED";

  return (
    <div className="min-h-screen bg-stone-50 pt-4 dark:bg-stone-950">
      <Nav session={session} active={active} memberships={memberships} />
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
