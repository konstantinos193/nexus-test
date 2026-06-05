-- M-2 extension: apply the same JSON array constraint to traits that phases and
-- fundReceivers already have. toNFTCollection() defensively casts traits with
-- Array.isArray; this constraint enforces the invariant at the storage layer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_traits_is_array'
  ) THEN
    ALTER TABLE "Collection"
      ADD CONSTRAINT chk_traits_is_array
      CHECK (traits IS NULL OR jsonb_typeof(traits) = 'array');
  END IF;
END $$;
