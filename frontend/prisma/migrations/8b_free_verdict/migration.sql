-- Lot 6: the free plan sees the verdict of one campaign, its first to reach
-- 20 counted answers. Kept once and for all (lib/server/tamani/free-verdict.ts).
ALTER TABLE "Organization" ADD COLUMN "freeVerdictCampaignId" TEXT;
