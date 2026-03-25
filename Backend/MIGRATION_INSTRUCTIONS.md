# Adding mintStart Field - Migration Instructions

The `mintStart` field has been added to the Prisma schema to support proper mint phase calculation and countdowns on the drop page.

## Quick Migration (Docker)

```bash
cd Backend

# Make sure containers are running
docker-compose -f docker-compose.dev.yml up -d

# Run migration
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name add_mint_start

# Generate Prisma client
docker-compose -f docker-compose.dev.yml exec backend npx prisma generate
```

## Manual Migration (if needed)

If the automatic migration doesn't work, you can run the SQL directly:

```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d nexus_db

# Then run:
ALTER TABLE "Collection" ADD COLUMN "mintStart" TIMESTAMP;
CREATE INDEX "Collection_mintStart_idx" ON "Collection"("mintStart");
```

## Verify Migration

After migration, verify the field exists:

```bash
# Check schema
docker-compose -f docker-compose.dev.yml exec backend npx prisma db pull

# Or check directly in database
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d nexus_db -c "\d \"Collection\""
```

You should see `mintStart` in the column list.

## After Migration

Once the migration is complete, you can:

1. **Run seed scripts** to create test collections with mintStart dates:
   ```bash
   npm run docker:seed:reset
   ```

2. **Restart backend** (if needed) to pick up schema changes:
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend
   ```

---

**Note:** The migration file is located at:
`Backend/prisma/migrations/20260127000000_add_mint_start/migration.sql`
