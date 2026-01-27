-- Add slug column (nullable first for backfill)
ALTER TABLE "Collection" ADD COLUMN "slug" TEXT;

-- Backfill: human-readable slug from name + first 8 chars of id for uniqueness
-- e.g. "NeXus Genesis" -> "nexus-genesis-a6daa649"
UPDATE "Collection" SET "slug" = (
  COALESCE(
    NULLIF(
      TRIM(BOTH '-' FROM regexp_replace(
        regexp_replace(
          regexp_replace(lower(trim("name")), '\s+', '-', 'g'),
          '[^a-z0-9-]', '', 'g'
        ),
        '-+', '-', 'g'
      )),
      ''
    ),
    'collection'
  ) || '-' || left("id", 8)
)
WHERE "slug" IS NULL;

-- Enforce NOT NULL and UNIQUE
ALTER TABLE "Collection" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

CREATE INDEX "Collection_slug_idx" ON "Collection"("slug");
