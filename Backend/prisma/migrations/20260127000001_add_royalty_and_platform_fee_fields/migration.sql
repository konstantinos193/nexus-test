-- Add royaltyBasisPoints and platformFeeBasisPoints fields to Collection table
-- These fields store royalty and platform fee percentages (in basis points)
-- Only indexed for tradable collections (collections that can be traded on secondary markets)

ALTER TABLE "Collection" ADD COLUMN "royaltyBasisPoints" INTEGER;
ALTER TABLE "Collection" ADD COLUMN "platformFeeBasisPoints" INTEGER;
