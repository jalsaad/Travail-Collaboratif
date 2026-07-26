import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/school-authorization";

// Même invariant que lib/school-authorization.ts : toujours re-vérifié frais
// en base, jamais via session.isSuperAdmin (snapshot JWT).
export async function assertIsSuperAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) {
    throw new ForbiddenError("Accès réservé au superadmin.");
  }
}
