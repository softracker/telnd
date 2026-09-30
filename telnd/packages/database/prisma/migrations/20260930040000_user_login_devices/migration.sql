-- CreateTable
CREATE TABLE "UserLoginDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "userAgent" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoginDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLoginDevice_userId_idx" ON "UserLoginDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLoginDevice_userId_deviceKey_key" ON "UserLoginDevice"("userId", "deviceKey");

-- AddForeignKey
ALTER TABLE "UserLoginDevice" ADD CONSTRAINT "UserLoginDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

