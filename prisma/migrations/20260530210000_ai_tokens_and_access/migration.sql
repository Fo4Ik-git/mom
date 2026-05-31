-- CreateTable
CREATE TABLE "AiTokenUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "calculatorId" TEXT,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiTokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "defaultMaxCalculators" INTEGER NOT NULL DEFAULT 5,
    "defaultAccessDays" INTEGER NOT NULL DEFAULT 30,
    "defaultReferrerBonusDays" INTEGER NOT NULL DEFAULT 0,
    "supportEmail" TEXT,
    "supportTelegram" TEXT,
    "accessExpiryCheckInterval" TEXT NOT NULL DEFAULT 'OFF',
    "accessExpiryCheckLastRunAt" DATETIME,
    "defaultAiTokenQuota" INTEGER,
    "defaultAiTokenQuotaPeriod" TEXT NOT NULL DEFAULT 'MONTH',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformSettings" ("id", "defaultMaxCalculators", "defaultAccessDays", "defaultReferrerBonusDays", "supportEmail", "supportTelegram", "accessExpiryCheckInterval", "accessExpiryCheckLastRunAt", "updatedAt")
SELECT "id", "defaultMaxCalculators", "defaultAccessDays", "defaultReferrerBonusDays", "supportEmail", "supportTelegram", "accessExpiryCheckInterval", "accessExpiryCheckLastRunAt", "updatedAt" FROM "PlatformSettings";
DROP TABLE "PlatformSettings";
ALTER TABLE "new_PlatformSettings" RENAME TO "PlatformSettings";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "passwordHash" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "maxCalculators" INTEGER,
    "accessExpiresAt" DATETIME,
    "issueBanDismissedAt" DATETIME,
    "issueExpiredDismissedFor" DATETIME,
    "adminNotes" TEXT,
    "aiAccessMode" TEXT NOT NULL DEFAULT 'OFF',
    "aiAccessExpiresAt" DATETIME,
    "aiAccessGrantedAt" DATETIME,
    "aiAccessDurationDays" INTEGER,
    "aiTokenQuota" INTEGER,
    "aiTokenQuotaPeriod" TEXT NOT NULL DEFAULT 'MONTH',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("id", "name", "email", "emailVerified", "passwordHash", "image", "role", "banned", "banReason", "maxCalculators", "accessExpiresAt", "issueBanDismissedAt", "issueExpiredDismissedFor", "adminNotes", "createdAt", "updatedAt")
SELECT "id", "name", "email", "emailVerified", "passwordHash", "image", "role", "banned", "banReason", "maxCalculators", "accessExpiresAt", "issueBanDismissedAt", "issueExpiredDismissedFor", "adminNotes", "createdAt", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AiTokenUsage_userId_createdAt_idx" ON "AiTokenUsage"("userId", "createdAt");
