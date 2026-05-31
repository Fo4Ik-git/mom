-- CreateTable
CREATE TABLE "AiChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "calculatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiChatThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiChatThread_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "Calculator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AiChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AiChatThread_userId_calculatorId_key" ON "AiChatThread"("userId", "calculatorId");

-- CreateIndex
CREATE INDEX "AiChatThread_calculatorId_idx" ON "AiChatThread"("calculatorId");

-- CreateIndex
CREATE INDEX "AiChatMessage_threadId_sortOrder_idx" ON "AiChatMessage"("threadId", "sortOrder");
