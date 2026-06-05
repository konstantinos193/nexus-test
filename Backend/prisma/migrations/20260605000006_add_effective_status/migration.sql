-- C-4: Add effectiveStatus column to store time-resolved status at write time.
-- This eliminates the application-level post-filter in findAll() that causes
-- broken pagination (page returning fewer items than requested).
--
-- effectiveStatus is computed and stored whenever a collection is written
-- (deployed, updated, or synced from blockchain). The sync service refresh
-- keeps it accurate for time-based transitions (minting → completed).

ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "effectiveStatus" TEXT;

-- Backfill existing rows based on stored status and phase schedule
UPDATE "Collection"
SET "effectiveStatus" = CASE
  -- Locked statuses never auto-transition
  WHEN status IN ('completed', 'paused', 'draft') THEN status

  -- All phases have past endDateTime → completed
  WHEN phases IS NOT NULL
    AND jsonb_array_length(phases) > 0
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(phases) AS p
      WHERE (p->>'endDateTime') IS NULL
         OR (p->>'endDateTime')::timestamptz > NOW()
    )
    THEN 'completed'

  -- At least one phase has started → minting
  WHEN phases IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(phases) AS p
      WHERE (p->>'startDateTime') IS NOT NULL
        AND (p->>'startDateTime')::timestamptz <= NOW()
    )
    THEN 'minting'

  -- Default: keep stored status
  ELSE status
END
WHERE "effectiveStatus" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_effective_status
  ON "Collection" ("effectiveStatus");
