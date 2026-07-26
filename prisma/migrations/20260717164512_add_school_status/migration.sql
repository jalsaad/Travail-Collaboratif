-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "status" "SchoolStatus" NOT NULL DEFAULT 'APPROVED';
