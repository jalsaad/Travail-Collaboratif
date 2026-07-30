-- AlterTable
ALTER TABLE "support_tickets"
  ADD COLUMN     "schoolId" TEXT,
  ADD COLUMN     "role" "Role";

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
