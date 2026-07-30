-- CreateEnum
CREATE TYPE "TeachingLevel" AS ENUM ('MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_INFERIEUR', 'SECONDAIRE_SUPERIEUR');

-- CreateTable
CREATE TABLE "membership_level_hours" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "level" "TeachingLevel" NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "membership_level_hours_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "membership_level_hours" ADD CONSTRAINT "membership_level_hours_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
