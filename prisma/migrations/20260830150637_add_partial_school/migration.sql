-- AlterEnum
ALTER TYPE "SchoolStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "directionEmail" TEXT,
ADD COLUMN     "directionNotifiedAt" TIMESTAMP(3);
