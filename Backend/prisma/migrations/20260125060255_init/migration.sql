-- CreateTable
CREATE TABLE "Collection" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_status_idx" ON "Collection"("status");

-- CreateIndex
CREATE INDEX "Collection_featured_idx" ON "Collection"("featured");

-- CreateIndex
CREATE INDEX "Collection_createdAt_idx" ON "Collection"("createdAt");

-- CreateIndex
CREATE INDEX "Collection_minted_idx" ON "Collection"("minted");

-- CreateIndex
CREATE INDEX "Collection_creatorAddress_idx" ON "Collection"("creatorAddress");

-- CreateIndex
CREATE INDEX "Collection_name_idx" ON "Collection"("name");
