import type { Prisma } from "@prisma/client";

// Trouve la Discipline existante par nom (déjà .trim()) ou la crée — évite
// d'imposer une liste figée (pas d'écran d'admin dédié aux disciplines
// aujourd'hui) tout en gardant la table normalisée pour le ciblage des
// annonces (cf. components/announcement-form.tsx) et le filtre de l'annuaire
// admin (cf. lib/admin-directory.ts).
export async function resolveOrCreateDiscipline(tx: Prisma.TransactionClient, name: string) {
  return tx.discipline.upsert({ where: { name }, update: {}, create: { name } });
}
