-- Wholesale offers, stock per option and shipping (2026-11-18).

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "offers" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "optionStock" JSONB,
ADD COLUMN "shippingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN "offerPicks" JSONB,
ADD COLUMN "fulfillment" TEXT;

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN "offerPicks" JSONB,
ADD COLUMN "optionQuantities" JSONB;

-- The old single wholesale price becomes one FROM offer.
UPDATE "Product"
SET "offers" = jsonb_build_array(jsonb_build_object('kind', 'FROM', 'qty', "wholesaleMinQty", 'price', "wholesalePrice", 'name', NULL))
WHERE "wholesalePrice" IS NOT NULL AND "wholesaleMinQty" IS NOT NULL;
