# Fix Failed Migration Issue

## Problem
The migration `20260127041736_clean_collection_slugs` failed and is blocking new migrations from being applied.

## Quick Fix (Recommended)

### Option 1: Using npm script
```bash
cd Backend
npm run docker:migrate-fix
```

### Option 2: Manual Docker command
```bash
cd Backend
docker-compose -f docker-compose.dev.yml exec backend sh -c "npx prisma migrate resolve --rolled-back 20260127041736_clean_collection_slugs && npx prisma migrate deploy"
```

### Option 3: If containers are not running
```bash
cd Backend
docker-compose -f docker-compose.dev.yml run --rm backend sh -c "npx prisma migrate resolve --rolled-back 20260127041736_clean_collection_slugs && npx prisma migrate deploy"
```

## What This Does

1. **Resolves the failed migration** - Marks `20260127041736_clean_collection_slugs` as rolled back (since it failed)
2. **Applies pending migrations** - Runs `migrate deploy` to apply any pending migrations including the new royalty/platform fee fields

## After Fixing

The Docker containers should now start successfully. The startup script has been updated to automatically resolve this issue in the future.

## If Issues Persist

If the migration keeps failing, you can:

1. **Check migration status:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate status
   ```

2. **Reset migrations (⚠️ Development only - loses data):**
   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Manually check the database:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d nexus_db -c "SELECT * FROM _prisma_migrations WHERE migration_name = '20260127041736_clean_collection_slugs';"
   ```

## Note

The `clean_collection_slugs` migration is a data migration that cleans up slug names. If it failed, the slugs may still have hash suffixes, but this won't break functionality. You can re-run the migration later if needed.
