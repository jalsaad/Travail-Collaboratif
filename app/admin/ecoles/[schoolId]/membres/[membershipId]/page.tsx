import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminMemberProfileForm } from "@/components/admin-member-profile-form";
import { AdminMemberRowActions } from "@/components/admin-member-row-actions";
import { AdminDeleteAccount } from "@/components/admin-delete-account";
import { isAnonymizedEmail } from "@/lib/account-deletion";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string; membershipId: string }>;
}) {
  const { schoolId, membershipId } = await params;

  const member = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId },
    include: { user: true, school: true },
  });
  if (!member) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/ecoles/${schoolId}`} className="text-sm text-brand-700 hover:underline dark:text-brand-500">
          ← {member.school.name}
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {member.user.firstName} {member.user.lastName}
        </h1>
      </div>

      <AdminMemberProfileForm
        membershipId={member.id}
        firstName={member.user.firstName}
        lastName={member.user.lastName}
        email={member.user.email}
        dateOfBirth={member.user.dateOfBirth ? member.user.dateOfBirth.toISOString().slice(0, 10) : ""}
        sex={member.user.sex ?? ""}
        matricule={member.user.matricule ?? ""}
      />

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-medium text-stone-700 dark:text-stone-300">Rôle et rattachement</h2>
        <AdminMemberRowActions
          membershipId={member.id}
          role={member.role}
          isAccountOwner={member.isAccountOwner}
        />
      </div>

      {!isAnonymizedEmail(member.user.email) && (
        <AdminDeleteAccount
          userId={member.user.id}
          email={member.user.email}
          returnTo={`/admin/ecoles/${schoolId}/membres/${membershipId}`}
        />
      )}
    </div>
  );
}
