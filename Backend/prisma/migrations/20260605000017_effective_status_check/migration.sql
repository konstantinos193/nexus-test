-- WARNING-1: Add CHECK constraint so effectiveStatus can only hold valid status values.
-- Without this, a bug in the cron CASE logic or a direct DB write could store arbitrary
-- strings, causing tab queries to silently return empty results.
ALTER TABLE "Collection"
  ADD CONSTRAINT chk_effective_status_valid
  CHECK (
    "effectiveStatus" IS NULL
    OR "effectiveStatus" IN ('draft', 'preparing', 'ready', 'minting', 'completed', 'paused')
  );
