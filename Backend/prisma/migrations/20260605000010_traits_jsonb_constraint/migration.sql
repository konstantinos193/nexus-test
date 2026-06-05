-- M-2 extension: apply the same JSON array constraint to traits that phases and
-- fundReceivers already have. toNFTCollection() defensively casts traits with
-- Array.isArray; this constraint enforces the invariant at the storage layer.
ALTER TABLE "Collection"
  ADD CONSTRAINT IF NOT EXISTS chk_traits_is_array
  CHECK (traits IS NULL OR jsonb_typeof(traits) = 'array');
