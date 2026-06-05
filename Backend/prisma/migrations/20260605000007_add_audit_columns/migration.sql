-- L-1: Add soft-delete column.
-- TypeORM @DeleteDateColumn automatically filters deleted rows from find() queries.
-- Existing rows get deletedAt = NULL (visible as normal).
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Partial index so soft-delete filter is fast on large tables.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_not_deleted
  ON "Collection" ("deletedAt")
  WHERE "deletedAt" IS NULL;

-- L-2: Track which wallet address last modified the collection.
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;
