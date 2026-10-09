import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMemberships, resolveActiveMembership } from "@/lib/active-school";
import { Nav } from "@/components/nav";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { SchoolApprovalNotice } from "@/components/school-approval-notice";
import { DemoBanner } from "@/components/demo-banner";
import { PrivacyPolicyNotice } from "@/components/privacy-policy-notice";
import { mustAcknowledgePrivacyPolicy } from "@/lib/privacy-policy";
import { SchoolLogoBadge } from "@/components/school-logo-badge";
import { getCurrentSchoolYear } from "@/lib/current-school-year";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const [memberships, currentUser, schoolYear] = await Promise.all([
    getActiveMemberships(session.userId),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { satisfactionRating: true, privacyAcceptedAt: true, privacyPolicyVersion: true },
    }),
    getCurrentSchoolYear(),
  ]);
  const active = await resolveActiveMembership(session.userId, memberships);
  // PARTIAL (cercle informel initié par un·e enseignant·e, cf.
  // app/(auth)/rejoindre/actions.ts::initiatePartialSchool) est opérationnelle
  // tout de suite, comme APPROVED — seules PENDING/REJECTED bloquent l'accès.
  const pending = active && active.schoolStatus !== "APPROVED" && active.schoolStatus !== "PARTIAL";

  return (
    // Sur téléphone, la barre fixe du haut (menu, sélecteur d'école, thème,
    // pastille de compte) occupe la bande 16 → 56 px sur TOUTE la largeur :
    // le sélecteur d'école y passe au-dessus du centre, là où le logo est
    // posé. Un `pt-4` faisait donc démarrer le logo SOUS ce sélecteur. Sur
    // écran large, les contrôles se tiennent aux deux bords et laissent le
    // centre libre : `sm:pt-4` y rétablit l'espacement d'origine.
    <div className="min-h-screen bg-stone-50 pt-[4.5rem] dark:bg-stone-950 sm:pt-4">
      {session.isDemo && <DemoBanner />}
      <Nav
        session={session}
        active={active}
        memberships={memberships}
        satisfactionRating={currentUser?.satisfactionRating ?? null}
        schoolYearLabel={schoolYear?.label ?? null}
      />
      {active && (
        <SchoolLogoBadge logoUrl={active.schoolLogoUrl} schoolName={active.schoolName} />
      )}
      {/* Indépendant du statut de l'école : l'obligation d'information vaut
          pour tout compte, y compris en attente d'approbation. Jamais en
          démonstration : le compte partagé ne pourrait rien enregistrer et
          le bandeau reviendrait à chaque visite. */}
      {!session.isDemo && currentUser && mustAcknowledgePrivacyPolicy(currentUser) && (
        <PrivacyPolicyNotice miseAJour={currentUser.privacyAcceptedAt !== null} />
      )}
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
