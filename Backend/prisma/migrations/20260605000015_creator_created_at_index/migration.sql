-- M2: Composite partial index for "My Collections" — filter by creator, sort newest first.
-- The existing single-column creatorAddress index forces a separate sort step.
-- This covering index eliminates the sort for the common dashboard query pattern:
--   WHERE creatorAddress = ? AND deletedAt IS NULL ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS idx_collection_creator_created_at
  ON "Collection" ("creatorAddress", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;
