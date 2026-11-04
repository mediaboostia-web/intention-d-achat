-- How many of each colour or size a respondent wants (2026-11-04). Null for the
-- answers before, and for products without options.
ALTER TABLE "Response" ADD COLUMN "optionQuantities" JSONB;
