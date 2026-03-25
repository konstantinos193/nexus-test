-- Clean up collection slugs by removing hash suffixes
-- This migration removes the ugly hash suffix (e.g., "preparing-launch-1ef372e8" -> "preparing-launch")
-- and handles duplicates by appending numbers (e.g., "preparing-launch-2")

-- Step 1: Create a temporary table to store cleaned slugs with uniqueness handling
CREATE TEMP TABLE slug_cleanup AS
WITH cleaned_slugs AS (
  -- Remove hash suffix: pattern is last dash followed by 8 hex characters
  -- e.g., "preparing-launch-1ef372e8" -> "preparing-launch"
  SELECT 
    id,
    "createdAt",
    CASE 
      -- Check if slug ends with pattern: -[8 hex chars]
      WHEN slug ~ '^(.+)-[0-9a-f]{8}$' THEN
        regexp_replace(slug, '-[0-9a-f]{8}$', '')
      ELSE
        slug
    END AS clean_slug
  FROM "Collection"
),
ranked_slugs AS (
  SELECT 
    id,
    clean_slug,
    ROW_NUMBER() OVER (
      PARTITION BY clean_slug 
      ORDER BY "createdAt" ASC
    ) AS slug_rank
  FROM cleaned_slugs
)
SELECT 
  id,
  CASE 
    WHEN slug_rank = 1 THEN clean_slug
    ELSE clean_slug || '-' || slug_rank::text
  END AS new_slug
FROM ranked_slugs;

-- Step 2: Update all collection slugs with cleaned versions
UPDATE "Collection" c
SET slug = sc.new_slug
FROM slug_cleanup sc
WHERE c.id = sc.id;

-- Step 3: Drop temporary table
DROP TABLE slug_cleanup;
