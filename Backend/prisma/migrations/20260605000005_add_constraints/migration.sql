-- M-2: Ensure phases and fundReceivers are JSON arrays (not objects, strings, etc.)
-- These CHECK constraints are the DB-level guard against malformed JSONB writes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_phases_is_array'
  ) THEN
    ALTER TABLE "Collection"
      ADD CONSTRAINT chk_phases_is_array
      CHECK (phases IS NULL OR jsonb_typeof(phases) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fund_receivers_is_array'
  ) THEN
    ALTER TABLE "Collection"
      ADD CONSTRAINT chk_fund_receivers_is_array
      CHECK ("fundReceivers" IS NULL OR jsonb_typeof("fundReceivers") = 'array');
  END IF;
END $$;

-- M-6: Prevent duplicate collection names per creator.
-- NOTE: If existing data has (creatorAddress, name) duplicates this migration will fail.
-- Detect first with:
--   SELECT "creatorAddress", name, COUNT(*) FROM "Collection"
--   GROUP BY "creatorAddress", name HAVING COUNT(*) > 1;
-- Resolve duplicates before applying, or skip this step and clean up manually.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_creator_name_unique
  ON "Collection" ("creatorAddress", name);
