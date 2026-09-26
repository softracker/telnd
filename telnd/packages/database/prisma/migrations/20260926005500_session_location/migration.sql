-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginCountryCode" TEXT,
ADD COLUMN     "lastLoginLocation" TEXT;
