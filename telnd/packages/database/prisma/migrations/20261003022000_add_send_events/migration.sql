-- CreateEnum
CREATE TYPE "SendChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "SendOutcome" AS ENUM ('SENT', 'FAILED', 'BLOCKED_DESTINATION', 'BLOCKED_DAILY');

-- CreateTable
CREATE TABLE "SendEvent" (
    "id" TEXT NOT NULL,
    "channel" "SendChannel" NOT NULL,
    "outcome" "SendOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SendEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SendEvent_createdAt_idx" ON "SendEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SendEvent_channel_createdAt_idx" ON "SendEvent"("channel", "createdAt");
