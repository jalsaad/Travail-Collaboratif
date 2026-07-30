-- AlterTable
ALTER TABLE "users"
  ADD COLUMN     "satisfactionRating" INTEGER,
  ADD COLUMN     "satisfactionRatedAt" TIMESTAMP(3);
