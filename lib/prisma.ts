import { PrismaClient } from "@prisma/client";
import { DemoModeError, isWriteOperation } from "@/lib/demo-mode";

// Verrou du compte de démonstration : toute écriture issue d'une session de
// démo est refusée ICI, au seul endroit que traversent toutes les écritures.
// Le poser action par action aurait condamné à y repenser à chaque nouvelle
// fonctionnalité — et une seule oubliée salit l'espace pour tous les
// visiteurs suivants.
//
// L'import de `@/auth` est dynamique et volontairement fait au moment de
// l'appel : `auth.ts` importe ce module (pour le provider Credentials), un
// import statique créerait donc un cycle à l'initialisation.
async function estSessionDemo(): Promise<boolean> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    return session?.isDemo === true;
  } catch {
    // Hors requête HTTP — scripts de seed, tâches planifiées, connexion en
    // cours (le cookie n'existe pas encore) : aucune session de démo à
    // protéger, on laisse écrire.
    return false;
  }
}

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        // Le contrôle ne coûte une lecture de session que sur les écritures :
        // l'immense majorité des requêtes de la démo sont des lectures et ne
        // paient rien.
        if (isWriteOperation(operation) && (await estSessionDemo())) {
          throw new DemoModeError();
        }
        return query(args);
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/// Client utilisable à l'intérieur d'un `$transaction`. Remplace
/// `Prisma.TransactionClient`, qui décrit le client NON étendu et n'accepte
/// donc plus le nôtre depuis l'ajout du verrou de démonstration ci-dessus.
/// Le client complet reste assignable à ce type — les helpers qui acceptent
/// « une transaction ou le client » continuent de fonctionner.
export type AppTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
