-- M-4: Convert mintAddress index to partial to exclude NULL rows.
-- mintAddress is NULL until on-chain deployment, so the full index wastes space
-- storing rows that will never be queried by address. Dropping and recreating
-- as a partial index keeps only the rows that actually have a mint address.
DROP INDEX IF EXISTS "Collection_mintAddress_idx";
CREATE INDEX IF NOT EXISTS "idx_collection_mint_address" ON "Collection" ("mintAddress") WHERE "mintAddress" IS NOT NULL;

-- L-1: Default royalty and platform fee to 0 so downstream math never null-checks.
ALTER TABLE "Collection" ALTER COLUMN "royaltyBasisPoints" SET DEFAULT 0;
ALTER TABLE "Collection" ALTER COLUMN "platformFeeBasisPoints" SET DEFAULT 0;
UPDATE "Collection" SET "royaltyBasisPoints" = 0 WHERE "royaltyBasisPoints" IS NULL;
UPDATE "Collection" SET "platformFeeBasisPoints" = 0 WHERE "platformFeeBasisPoints" IS NULL;
