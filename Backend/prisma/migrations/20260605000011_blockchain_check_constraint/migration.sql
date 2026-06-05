-- Guard against arbitrary strings in the blockchain column.
-- Currently only 'solana' is valid. Extend this list when adding chain support.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_blockchain_valid'
  ) THEN
    ALTER TABLE "Collection"
      ADD CONSTRAINT chk_blockchain_valid
      CHECK (blockchain IN ('solana'));
  END IF;
END $$;
