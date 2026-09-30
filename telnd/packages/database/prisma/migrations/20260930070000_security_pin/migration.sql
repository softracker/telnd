-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinSetAt" TIMESTAMP(3);
