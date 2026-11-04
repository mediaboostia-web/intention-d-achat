-- Onboarding (2026-11-04): what a shop is and where it sells. Null for the
-- shops made before; WHOLESALER | IMPORTER | BOTH | OTHER and ONLINE | STORE | BOTH.
ALTER TABLE "Organization" ADD COLUMN "businessType" TEXT,
ADD COLUMN "salesChannel" TEXT;
