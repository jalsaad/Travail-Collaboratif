// ---------------------------------------------------------------------------
// lib/prospection-suivi.ts
// Report du suivi de campagne dans l'annuaire (table fwb_schools), qu'affiche
// la page Cartographie de l'espace plateforme.
//
// La campagne travaille sur des fichiers CSV, la cartographie sur la base : les
// deux s'ignoraient, et une école contactée restait indéfiniment « à
// contacter » à l'écran. Le pont se fait par le numéro FASE, seul identifiant
// commun — d'où la colonne `numero_fase` que scripts/synchroniser-prospection.ts
// inscrit dans le fichier de prospection.
// ---------------------------------------------------------------------------

import { PrismaClient, ProspectionStatus } from "@prisma/client";

/// Fait avancer le statut d'un cran, sans jamais revenir en arrière :
///
///   à contacter → contactée → relancée → relancée → …
///
/// « Refus » est un jugement humain, saisi depuis la fiche de l'école : un
/// envoi automatique ne doit pas l'effacer. Une école qui a dit non et qu'on
/// recontacte par inadvertance reste marquée comme ayant refusé.
export function statutSuivant(actuel: ProspectionStatus): ProspectionStatus {
  if (actuel === "REFUS") return "REFUS";
  return actuel === "A_CONTACTER" ? "CONTACTEE" : "RELANCEE";
}

/// Enregistre qu'une école a été contactée. Ne lève jamais : un envoi réussi
/// ne doit pas être présenté comme un échec parce que le suivi n'a pas pu être
/// écrit — le journal du fichier, lui, fait foi pour ne pas réécrire deux fois.
export async function marquerContactee(
  prisma: PrismaClient,
  numeroFase: string,
  email: string | null,
  quand: Date = new Date()
): Promise<"marquée" | "inconnue" | "erreur"> {
  try {
    const ecole = await prisma.fwbSchool.findUnique({
      where: { numeroFase },
      select: { prospectionStatus: true, emailDirection: true },
    });
    if (!ecole) return "inconnue";

    await prisma.fwbSchool.update({
      where: { numeroFase },
      data: {
        prospectionStatus: statutSuivant(ecole.prospectionStatus),
        lastContactedAt: quand,
        // L'adresse réellement servie vaut d'être conservée : c'est elle qu'on
        // relancera. Une adresse déjà saisie à la main n'est pas écrasée.
        emailDirection: ecole.emailDirection ?? email,
      },
    });
    return "marquée";
  } catch (error) {
    console.error(`[suivi] Report impossible pour FASE ${numeroFase} :`, error);
    return "erreur";
  }
}
