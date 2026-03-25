-- Add mintAddress column to Collection table if it doesn't exist
ALTER TABLE "Collection" 
ADD COLUMN IF NOT EXISTS "mintAddress" VARCHAR(255);

-- Create index on mintAddress for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_Collection_mintAddress" ON "Collection"("mintAddress");
