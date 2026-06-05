#!/bin/sh
set -e

# Mark historical migrations as applied without re-running their SQL.
# These were created before Prisma migration tracking was in place.
echo "=== Baselining historical migrations ==="
npx prisma migrate resolve --applied 20250101000000_init 2>/dev/null || true
npx prisma migrate resolve --applied 20250127120000_add_collection_slug 2>/dev/null || true
npx prisma migrate resolve --applied 20260125060255_init 2>/dev/null || true
npx prisma migrate resolve --applied 20260127000000_add_mint_start 2>/dev/null || true
npx prisma migrate resolve --applied 20260127000001_add_royalty_and_platform_fee_fields 2>/dev/null || true
npx prisma migrate resolve --applied 20260127041736_clean_collection_slugs 2>/dev/null || true
npx prisma migrate resolve --applied 20260525000000_add_mint_address 2>/dev/null || true

# Migrations are run by CI before the container starts.
# For local development outside CI, run: npx prisma migrate deploy

exec node dist/main.js
