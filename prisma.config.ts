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
    // Options passées en ligne plutôt que via tsconfig.json : celui-ci déclare
    // `module: "esnext"`, que ts-node charge en silence sans rien exécuter —
    // le seed sortait en code 0 sans écrire une ligne en base.
    seed: 'ts-node --compiler-options {"module":"commonjs","moduleResolution":"node"} prisma/seed.ts',
  },
});
