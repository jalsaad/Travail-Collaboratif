import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminEditPeriodForm } from "@/components/admin-edit-period-form";

export default async function AdminModifierPeriodePage({
  params,
  searchParams,
}: {
  params: Promise<{ periodId: string }>;
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const { periodId } = await params;
  const { schoolId } = await searchParams;

  const period = await prisma.collaborativePeriod.findUnique({ where: { id: periodId } });
  if (!period) notFound();

  const returnTo = schoolId ? `/admin/ecoles/${schoolId}` : "/admin/ecoles";

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">Modifier la période</h1>
      <AdminEditPeriodForm
        periodId={period.id}
        returnTo={returnTo}
        type={period.type}
        date={period.date.toISOString().slice(0, 10)}
        dureePeriodes={period.dureePeriodes.toString()}
        description={period.description}
      />
    </div>
  );
}
