-- AlterTable
ALTER TABLE "form_rejections" ADD COLUMN     "contactedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "schoolName" TEXT;

