/*
  Warnings:

  - You are about to drop the `CalculatorShare` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "issueBanDismissedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "issueExpiredDismissedFor" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CalculatorShare";
PRAGMA foreign_keys=on;
