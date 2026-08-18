-- CreateEnum
CREATE TYPE "ExternalParticipantStatus" AS ENUM ('EDUCATEUR', 'DIRECTION', 'PERSONNEL_ADMINISTRATIF', 'PERSONNEL_OUVRIER', 'CPMS', 'INTERVENANT_EXTERNE', 'AUTRE');

-- CreateTable
CREATE TABLE "external_participants" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "status" "ExternalParticipantStatus" NOT NULL,

    CONSTRAINT "external_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_participants_periodId_idx" ON "external_participants"("periodId");

-- AddForeignKey
ALTER TABLE "external_participants" ADD CONSTRAINT "external_participants_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "collaborative_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
