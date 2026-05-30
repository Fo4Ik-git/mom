-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN "defaultReferrerBonusDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AccessKey" ADD COLUMN "referrerBonusDays" INTEGER;
