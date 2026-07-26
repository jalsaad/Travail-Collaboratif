-- AlterEnum
ALTER TYPE "ExportScope" ADD VALUE 'BATCH';

-- AlterTable
ALTER TABLE "export_logs" ADD COLUMN "targetUserIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "export_logs" ADD COLUMN "rangeStart" TIMESTAMP(3);
ALTER TABLE "export_logs" ADD COLUMN "rangeEnd" TIMESTAMP(3);
