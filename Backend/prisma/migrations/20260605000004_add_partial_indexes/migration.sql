-- H-2: Partial index for the free_mint tab query (WHERE price = 0 OR price IS NULL).
-- A partial index is much smaller than a full B-tree index on price since free mints
-- are a small subset of all collections.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_free_mint
  ON "Collection" (price)
  WHERE price = 0 OR price IS NULL;

-- H-5: Partial index for the ending_soon tab query (WHERE endDate > NOW() ORDER BY endDate ASC).
-- Excludes already-ended collections from the index, keeping it selective over time.
-- NOTE: This index becomes stale as NOW() advances — schedule periodic REINDEX CONCURRENTLY
-- (e.g. weekly via pg_cron) to keep the partial predicate accurate.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_ending_soon
  ON "Collection" ("endDate" ASC NULLS LAST)
  WHERE "endDate" IS NOT NULL;
