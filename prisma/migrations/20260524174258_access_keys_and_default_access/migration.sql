-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'REGISTRATION',
    "label" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "accessDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "referrerUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccessKey_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessKeyRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessKeyRedemption_accessKeyId_fkey" FOREIGN KEY ("accessKeyId") REFERENCES "AccessKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccessKeyRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "defaultMaxCalculators" INTEGER NOT NULL DEFAULT 5,
    "defaultAccessDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformSettings" ("defaultMaxCalculators", "id", "updatedAt") SELECT "defaultMaxCalculators", "id", "updatedAt" FROM "PlatformSettings";
DROP TABLE "PlatformSettings";
ALTER TABLE "new_PlatformSettings" RENAME TO "PlatformSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_code_key" ON "AccessKey"("code");

-- CreateIndex
CREATE INDEX "AccessKey_kind_active_idx" ON "AccessKey"("kind", "active");

-- CreateIndex
CREATE INDEX "AccessKey_referrerUserId_idx" ON "AccessKey"("referrerUserId");

-- CreateIndex
CREATE INDEX "AccessKeyRedemption_accessKeyId_idx" ON "AccessKeyRedemption"("accessKeyId");

-- CreateIndex
CREATE INDEX "AccessKeyRedemption_userId_idx" ON "AccessKeyRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessKeyRedemption_accessKeyId_userId_key" ON "AccessKeyRedemption"("accessKeyId", "userId");
