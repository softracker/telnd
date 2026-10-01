-- Refresh rotation bookkeeping (security audit #14 / #39):
-- usedAt  — tombstone: the row was already spent; a replay is theft.
-- familyId — the sign-in lineage this token descends from (reuse revokes it all).
-- sessionId — the access session this token minted, so rotation reuses it.
ALTER TABLE "RefreshToken" ADD COLUMN "usedAt" TIMESTAMP(3),
ADD COLUMN "familyId" TEXT,
ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
