-- Add mintStart field to Collection table
-- This field stores when minting starts, used for countdown and phase calculation

ALTER TABLE "Collection" ADD COLUMN "mintStart" TIMESTAMP;

-- Add index for querying by mint start date (useful for "upcoming" collections)
CREATE INDEX "Collection_mintStart_idx" ON "Collection"("mintStart");
