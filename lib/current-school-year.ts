import { prisma } from "@/lib/prisma";

// Définition unique de « l'année scolaire courante ».
//
// C'est la SchoolYear dont la date de début est la plus récente — et non
// celle qui encadre la date du jour. Ce choix est délibéré : l'archivage de
// fin d'année crée l'année suivante avant qu'elle ne commence (cf.
// lib/school-year-archive.ts), et les déclarations doivent basculer dessus
// immédiatement, sans attendre la rentrée.
//
// Cette requête était recopiée dans douze fichiers ; la centraliser évite
// qu'une évolution de cette règle n'en oublie un.
export function getCurrentSchoolYear() {
  return prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } });
}
