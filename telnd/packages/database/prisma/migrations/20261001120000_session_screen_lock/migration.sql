-- Screen lock, server-enforced (security audit #33): the lock was a
-- browser overlay with a localStorage flag anyone could clear. The flag
-- now also lives on the session row — authMiddleware refuses every route
-- outside the lock's own endpoints until /auth/session/unlock proves the
-- PIN and clears it.
ALTER TABLE "Session" ADD COLUMN "lockedAt" TIMESTAMP(3);
