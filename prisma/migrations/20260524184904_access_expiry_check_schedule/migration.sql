-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "defaultMaxCalculators" INTEGER NOT NULL DEFAULT 5,
    "defaultAccessDays" INTEGER NOT NULL DEFAULT 30,
    "supportEmail" TEXT,
    "supportTelegram" TEXT,
    "accessExpiryCheckInterval" TEXT NOT NULL DEFAULT 'OFF',
    "accessExpiryCheckLastRunAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformSettings" ("defaultAccessDays", "defaultMaxCalculators", "id", "supportEmail", "supportTelegram", "updatedAt") SELECT "defaultAccessDays", "defaultMaxCalculators", "id", "supportEmail", "supportTelegram", "updatedAt" FROM "PlatformSettings";
DROP TABLE "PlatformSettings";
ALTER TABLE "new_PlatformSettings" RENAME TO "PlatformSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
