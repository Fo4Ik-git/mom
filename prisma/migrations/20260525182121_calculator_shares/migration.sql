-- CreateTable
CREATE TABLE "CalculatorShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDIT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalculatorShare_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "Calculator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalculatorShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CalculatorShare_calculatorId_idx" ON "CalculatorShare"("calculatorId");

-- CreateIndex
CREATE INDEX "CalculatorShare_userId_idx" ON "CalculatorShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatorShare_calculatorId_userId_key" ON "CalculatorShare"("calculatorId", "userId");
