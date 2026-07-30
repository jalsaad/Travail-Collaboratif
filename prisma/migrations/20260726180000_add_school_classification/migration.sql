-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('MATERNELLE', 'PRIMAIRE', 'SECONDAIRE');

-- CreateEnum
CREATE TYPE "EducationType" AS ENUM ('ORDINAIRE', 'SPECIALISE');

-- AlterTable
ALTER TABLE "schools"
  ADD COLUMN     "region" TEXT,
  ADD COLUMN     "niveaux" "SchoolLevel"[] NOT NULL DEFAULT ARRAY[]::"SchoolLevel"[],
  ADD COLUMN     "typesEnseignement" "EducationType"[] NOT NULL DEFAULT ARRAY[]::"EducationType"[];
