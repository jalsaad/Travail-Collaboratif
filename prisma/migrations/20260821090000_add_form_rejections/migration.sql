-- CreateTable
CREATE TABLE "form_rejections" (
    "id" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "field" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_rejections_form_createdAt_idx" ON "form_rejections"("form", "createdAt");
