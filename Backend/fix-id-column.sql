-- Fix the id column to be a proper UUID with auto-generation
-- First, drop the existing table (this will delete all data)
DROP TABLE IF EXISTS "Collection" CASCADE;

-- Recreate the table with proper schema
CREATE TABLE "Collection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "bannerUrl" TEXT,
    "creator" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL DEFAULT 'solana',
    "totalSupply" INTEGER NOT NULL DEFAULT 0,
    "minted" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP WITHOUT TIME ZONE,
    "traits" JSONB,
    "ipfsHash" TEXT,
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mintStart" TIMESTAMP WITHOUT TIME ZONE,
    "royaltyBasisPoints" INTEGER,
    "platformFeeBasisPoints" INTEGER,
    "mintAddress" VARCHAR(255),
    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "IDX_Collection_slug" ON "Collection"("slug");
CREATE INDEX "IDX_Collection_name" ON "Collection"("name");
CREATE INDEX "IDX_Collection_creatorAddress" ON "Collection"("creatorAddress");
CREATE INDEX "IDX_Collection_blockchain" ON "Collection"("blockchain");
CREATE INDEX "IDX_Collection_totalSupply" ON "Collection"("totalSupply");
CREATE INDEX "IDX_Collection_minted" ON "Collection"("minted");
CREATE INDEX "IDX_Collection_status" ON "Collection"("status");
CREATE INDEX "IDX_Collection_featured" ON "Collection"("featured");
CREATE INDEX "IDX_Collection_createdAt" ON "Collection"("createdAt");
CREATE INDEX "IDX_Collection_mintAddress" ON "Collection"("mintAddress");
