-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "sex" "Sex",
ADD COLUMN     "matricule" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_matricule_key" ON "users"("matricule");
