-- Lot 7b: the currency follows the shop's country (porteur, 2026-10-29).
-- Until now every shop was created in XOF, Guinea and Cameroon included.
UPDATE "Organization"
SET "currency" = CASE
  WHEN "country" IN ('CM', 'GA', 'CG', 'TD', 'CF', 'GQ') THEN 'XAF'
  WHEN "country" = 'GN' THEN 'GNF'
  WHEN "country" = 'CD' THEN 'CDF'
  ELSE 'XOF'
END;
