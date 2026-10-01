-- Security PIN hardening (security audit #26):
-- bcrypt replaces sha256(userId:pin) for new/rotated PINs (legacy hashes
-- upgrade in place on first successful verify), and the attempt cap moves
-- from an in-memory Map to durable columns so restarts can't clear it and
-- every instance shares the window.
ALTER TABLE "AdminUser" ADD COLUMN "pinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pinWindowStart" TIMESTAMP(3);
