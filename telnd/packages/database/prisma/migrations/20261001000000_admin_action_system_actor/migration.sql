-- Activity feed: system events (SMTP deliveries) have no actor.
ALTER TABLE "AdminAction" ALTER COLUMN "adminId" DROP NOT NULL;
