-- CreateTable
CREATE TABLE "participation_tokens" (
    "id" TEXT NOT NULL,
    "periodParticipantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participation_tokens_tokenHash_key" ON "participation_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "participation_tokens_periodParticipantId_idx" ON "participation_tokens"("periodParticipantId");

-- AddForeignKey
ALTER TABLE "participation_tokens" ADD CONSTRAINT "participation_tokens_periodParticipantId_fkey" FOREIGN KEY ("periodParticipantId") REFERENCES "period_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
