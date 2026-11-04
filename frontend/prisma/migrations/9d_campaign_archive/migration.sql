-- A campaign deleted while it had answers or orders is archived, not erased (2026-11-04).
ALTER TABLE "Campaign" ADD COLUMN "archivedAt" TIMESTAMP(3);
