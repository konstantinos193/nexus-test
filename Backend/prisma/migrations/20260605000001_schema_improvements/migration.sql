-- Fix price precision: DOUBLE PRECISION loses decimal accuracy for SOL amounts
ALTER TABLE "Collection"
  ALTER COLUMN "price" TYPE NUMERIC(18, 9)
  USING "price"::NUMERIC(18, 9);

-- Rename ipfsHash to txSignature — field stores a Solana tx signature, not an IPFS CID
ALTER TABLE "Collection" RENAME COLUMN "ipfsHash" TO "txSignature";

-- Drop redundant plain index on slug — the UNIQUE index already covers all lookups
DROP INDEX IF EXISTS "Collection_slug_idx";

-- Enforce valid status values at the DB level
ALTER TABLE "Collection"
  ADD CONSTRAINT "Collection_status_check"
  CHECK (status IN ('draft', 'preparing', 'ready', 'minting', 'completed', 'paused'));
