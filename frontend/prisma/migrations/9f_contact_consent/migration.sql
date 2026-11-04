-- The popup asks whether the client agrees to be contacted (2026-11-04). The
-- clients recorded before were told their number goes to the shop to call them
-- back about the product: they keep their number visible.
ALTER TABLE "Respondent" ADD COLUMN "contactConsentAt" TIMESTAMP(3);
UPDATE "Respondent" SET "contactConsentAt" = "firstSeenAt" WHERE "phoneE164" IS NOT NULL;
