-- Idempotent re-init: safe to run after 20250101000000_init
-- Uses IF NOT EXISTS so it's a no-op on an already-initialized database
CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "creator" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL DEFAULT 'solana',
    "totalSupply" INTEGER NOT NULL DEFAULT 0,
    "minted" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP(3),
    "traits" JSONB,
    "ipfsHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Collection_status_idx" ON "Collection"("status");
CREATE INDEX IF NOT EXISTS "Collection_featured_idx" ON "Collection"("featured");
CREATE INDEX IF NOT EXISTS "Collection_createdAt_idx" ON "Collection"("createdAt");
CREATE INDEX IF NOT EXISTS "Collection_minted_idx" ON "Collection"("minted");
CREATE INDEX IF NOT EXISTS "Collection_creatorAddress_idx" ON "Collection"("creatorAddress");
CREATE INDEX IF NOT EXISTS "Collection_name_idx" ON "Collection"("name");
