-- Lot 6b: a respondent outside the shop's zones names the place to deliver
-- (« Autre endroit »). Null when a zone is chosen or the respondent picks up.
ALTER TABLE "Response" ADD COLUMN "deliveryPlace" TEXT;
