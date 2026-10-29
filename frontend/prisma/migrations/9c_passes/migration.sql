-- Lot 8: prepaid passes. The pass in force lives on Subscription; an answer
-- counts in a pass once countedAt is set; an Order is a shop's pass purchase.

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "responsesIncluded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "countedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "activatedAt" TIMESTAMP(3);

-- Backfill: the answers already open count from their completion.
UPDATE "Response" SET "countedAt" = "completedAt"
WHERE "completedAt" IS NOT NULL AND "locked" = false;

-- CreateIndex
CREATE INDEX "Response_organizationId_countedAt_idx" ON "Response"("organizationId", "countedAt");

-- CreateIndex
CREATE INDEX "Order_organizationId_createdAt_idx" ON "Order"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_provider_status_createdAt_idx" ON "Order"("provider", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
