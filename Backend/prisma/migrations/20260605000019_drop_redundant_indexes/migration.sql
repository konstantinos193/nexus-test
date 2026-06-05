-- WARNING-6: Drop redundant indexes that are superseded by existing composite/GIN indexes.
--
-- Collection_createdAt_idx  → superseded by idx_collection_created_at_id_desc (cursor pagination)
--                              and Collection_status_createdAt_idx (status+sort composite).
--                              Single-column createdAt ordering is never needed without status.
--
-- Collection_name_idx       → superseded by idx_collection_name_trgm (GIN, pg_trgm).
--                              ILIKE '%term%' searches use GIN; B-tree equality on name
--                              is not a query pattern in this codebase.
--
-- Each dropped index reduces write amplification on every INSERT/UPDATE by one B-tree
-- page split.

DROP INDEX IF EXISTS "Collection_createdAt_idx";
DROP INDEX IF EXISTS "Collection_name_idx";
