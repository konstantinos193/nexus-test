-- H-3: Add pg_trgm GIN indexes to support ILIKE '%term%' searches on name and description.
-- Without these, every search is a full sequential scan (O(n) per request).
-- CONCURRENTLY avoids locking the table during index creation.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_name_trgm
  ON "Collection" USING GIN (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_description_trgm
  ON "Collection" USING GIN (description gin_trgm_ops);
