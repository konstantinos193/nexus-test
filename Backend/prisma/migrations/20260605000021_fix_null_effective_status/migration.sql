-- M-4: Safety-net backfill for rows where effectiveStatus is still NULL.
-- Migration 20260605000006 backfilled based on phase logic, but rows that
-- existed with NULL phases and non-locked status may have been missed.
-- Fallback: effectiveStatus = status (always valid per the CHECK constraint).

UPDATE "Collection"
SET "effectiveStatus" = status
WHERE "effectiveStatus" IS NULL;
