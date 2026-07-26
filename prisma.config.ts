// Un fichier prisma.config.ts présent désactive le chargement automatique de
// .env que Prisma faisait auparavant — on le recharge nous-même (API native
// Node, aucune dépendance dotenv nécessaire).
try {
  process.loadEnvFile();
} catch {
  // Pas de .env (ex: variables déjà injectées par l'environnement) — ignoré.
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node prisma/seed.ts",
  },
});
