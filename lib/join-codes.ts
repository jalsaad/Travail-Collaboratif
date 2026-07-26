import type { Prisma } from "@prisma/client";

function generateJoinCode(schoolName: string): string {
  const prefix =
    schoolName
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 4)
      .toUpperCase() || "ECOL";
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${year}-${suffix}`;
}

// Crée un nouveau JoinCode actif pour une école, avec boucle anti-collision
// sur la contrainte @unique(code). Ne désactive pas d'éventuel code déjà
// actif — à l'appelant de le faire s'il s'agit d'une régénération.
export async function createJoinCodeForSchool(
  tx: Prisma.TransactionClient,
  schoolId: string,
  schoolName: string,
  createdById: string
) {
  let code = generateJoinCode(schoolName);
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await tx.joinCode.findUnique({ where: { code } });
    if (!clash) break;
    code = generateJoinCode(schoolName);
  }

  return tx.joinCode.create({
    data: { schoolId, code, active: true, createdById },
  });
}
