-- CreateEnum
CREATE TYPE "ProspectionStatus" AS ENUM ('A_CONTACTER', 'CONTACTEE', 'RELANCEE', 'REFUS');

-- CreateTable
CREATE TABLE "fwb_schools" (
    "numeroFase" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numeroBce" TEXT,
    "typesEnseignement" TEXT[],
    "niveaux" "SchoolLevel"[] DEFAULT ARRAY[]::"SchoolLevel"[],
    "genres" "EducationType"[] DEFAULT ARRAY[]::"EducationType"[],
    "reseau" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT,
    "locality" TEXT,
    "commune" TEXT,
    "bassin" TEXT,
    "arrondissement" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "implantationCount" INTEGER NOT NULL DEFAULT 1,
    "poFase" TEXT,
    "poName" TEXT,
    "poBce" TEXT,
    "poAddress" TEXT,
    "poPostalCode" TEXT,
    "poLocality" TEXT,
    "emailDirection" TEXT,
    "poEmail" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "prospectionStatus" "ProspectionStatus" NOT NULL DEFAULT 'A_CONTACTER',
    "lastContactedAt" TIMESTAMP(3),
    "notes" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fwb_schools_pkey" PRIMARY KEY ("numeroFase")
);

-- CreateIndex
CREATE INDEX "fwb_schools_reseau_idx" ON "fwb_schools"("reseau");
CREATE INDEX "fwb_schools_bassin_idx" ON "fwb_schools"("bassin");
CREATE INDEX "fwb_schools_prospectionStatus_idx" ON "fwb_schools"("prospectionStatus");
