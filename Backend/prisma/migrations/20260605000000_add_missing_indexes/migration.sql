-- Drop redundant slug index (the @unique constraint already creates one)
DROP INDEX IF EXISTS "Collection_slug_idx";

-- Missing single-column indexes
CREATE INDEX IF NOT EXISTS "Collection_endDate_idx" ON "Collection"("endDate");
CREATE INDEX IF NOT EXISTS "Collection_price_idx" ON "Collection"("price");

-- Composite indexes for the most common multi-column query patterns
CREATE INDEX IF NOT EXISTS "Collection_status_createdAt_idx" ON "Collection"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Collection_featured_minted_idx" ON "Collection"("featured", "minted" DESC);
CREATE INDEX IF NOT EXISTS "Collection_status_mintStart_idx" ON "Collection"("status", "mintStart");
