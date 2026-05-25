-- Add mintAddress field to Collection table
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "mintAddress" TEXT;

CREATE INDEX IF NOT EXISTS "Collection_mintAddress_idx" ON "Collection"("mintAddress");
