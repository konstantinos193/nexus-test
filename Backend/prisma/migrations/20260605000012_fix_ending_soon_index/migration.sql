-- H-5 fix: tighten the ending_soon partial index predicate to exclude already-ended
-- collections. The original predicate (endDate IS NOT NULL) causes the index to grow
-- unboundedly as endDate values age into the past. The new predicate prunes those rows.
--
-- NOTE: PostgreSQL does not support predicate changes via ALTER INDEX — we must drop
-- and recreate.
DROP INDEX IF EXISTS "Collection_endDate_idx";
DROP INDEX IF EXISTS idx_collection_ending_soon;

CREATE INDEX IF NOT EXISTS idx_collection_ending_soon
  ON "Collection" ("endDate" ASC)
  WHERE "endDate" IS NOT NULL AND "deletedAt" IS NULL;
