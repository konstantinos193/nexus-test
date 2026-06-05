-- M3: Partial index on txSignature for on-chain sync lookups.
-- The sync service may verify a collection by its transaction signature;
-- without this index every lookup is a full table scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_tx_signature
  ON "Collection" ("txSignature")
  WHERE "txSignature" IS NOT NULL;
