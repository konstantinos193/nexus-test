-- Guard against arbitrary strings in the blockchain column.
-- Currently only 'solana' is valid. Extend this list when adding chain support.
ALTER TABLE "Collection"
  ADD CONSTRAINT IF NOT EXISTS chk_blockchain_valid
  CHECK (blockchain IN ('solana'));
