-- CreateTable
CREATE TABLE "peer_referrals" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "referredByMembershipId" TEXT NOT NULL,
    "periodId" TEXT,
    "invitedName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peer_referrals_tokenHash_key" ON "peer_referrals"("tokenHash");

-- CreateIndex
CREATE INDEX "peer_referrals_schoolId_idx" ON "peer_referrals"("schoolId");

-- AddForeignKey
ALTER TABLE "peer_referrals" ADD CONSTRAINT "peer_referrals_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_referrals" ADD CONSTRAINT "peer_referrals_referredByMembershipId_fkey" FOREIGN KEY ("referredByMembershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_referrals" ADD CONSTRAINT "peer_referrals_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "collaborative_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
