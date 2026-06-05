-- WARNING-2: Add composite index for effectiveStatus-based tab queries.
-- Tab queries filter on effectiveStatus + sort by createdAt DESC. The existing
-- single-column effectiveStatus index covers the filter but forces a separate sort step.
-- This partial composite eliminates the filesort for the common case (non-deleted rows).
CREATE INDEX IF NOT EXISTS idx_collection_effective_status_created_at
  ON "Collection" ("effectiveStatus", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;
