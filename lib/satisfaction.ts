import { prisma } from "@/lib/prisma";

// Résultat public des évaluations, affiché sur la page d'accueil.
//
// Les notes sont collectées dans le tiroir de navigation
// (cf. components/satisfaction-stars.tsx) : une note courante par compte, pas
// un historique — recliquer change d'avis.

/// En deçà de ce nombre d'avis, RIEN n'est affiché.
///
/// Une moyenne calculée sur deux votes n'est pas une moyenne, c'est une
/// anecdote : un seul mécontent la ferait chuter de deux points du jour au
/// lendemain, et un « 5 sur 5 — 2 avis » dessert plus qu'il ne sert. Le seuil
/// protège donc autant la sincérité du chiffre que l'image de la plateforme.
export const MIN_AVIS_PUBLIC = 5;

export type SatisfactionPublique = {
  /// Moyenne sur 5, arrondie au dixième.
  moyenne: number;
  /// Nombre de comptes ayant donné une note.
  total: number;
};

/// Renvoie null tant que le seuil n'est pas atteint — l'appelant n'affiche
/// alors simplement rien, sans cas particulier à traiter.
export async function getPublicSatisfaction(): Promise<SatisfactionPublique | null> {
  const agregat = await prisma.user.aggregate({
    where: { satisfactionRating: { not: null } },
    _avg: { satisfactionRating: true },
    _count: { satisfactionRating: true },
  });

  const moyenne = agregat._avg.satisfactionRating;
  const total = agregat._count.satisfactionRating;
  if (moyenne === null || total < MIN_AVIS_PUBLIC) return null;

  return { moyenne: Math.round(moyenne * 10) / 10, total };
}
