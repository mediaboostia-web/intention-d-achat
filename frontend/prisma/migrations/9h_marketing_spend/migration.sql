-- CreateTable
CREATE TABLE "MarketingSpend" (
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSpend_pkey" PRIMARY KEY ("month")
);

