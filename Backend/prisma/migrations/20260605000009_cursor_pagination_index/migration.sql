-- Composite index for cursor-based pagination in findAll().
-- findAll() orders by (createdAt DESC, id DESC) and uses the cursor condition:
--   (c.createdAt < :cur OR (c.createdAt = :cur AND c.id < :curId))
-- Without this index PostgreSQL uses the single createdAt index and sorts id
-- in memory, which degrades linearly above ~10k rows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_created_at_id_desc
  ON "Collection" ("createdAt" DESC, "id" DESC);
