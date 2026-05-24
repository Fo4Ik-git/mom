-- AlterTable
ALTER TABLE "User" ADD COLUMN "accessExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "User" ADD COLUMN "maxCalculators" INTEGER;

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "defaultMaxCalculators" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);
