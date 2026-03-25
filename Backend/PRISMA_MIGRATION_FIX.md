# Prisma Migration Troubleshooting Guide

## Common Error: "Could not parse schema engine response"

This error typically occurs when:
1. Prisma cache is corrupted
2. OpenSSL compatibility issues in Docker
3. Migration state is inconsistent
4. Prisma engine binary issues

## Quick Fix (Recommended)

Run this command to fix most migration issues:

```bash
npm run docker:migrate:fix
```

This will:
1. Clear Prisma cache
2. Validate the schema
3. Regenerate Prisma client
4. Apply migrations

## Step-by-Step Manual Fix

If the quick fix doesn't work, follow these steps:

### 1. Clear Prisma Cache and Regenerate

```bash
docker-compose -f docker-compose.dev.yml exec backend sh -c "rm -rf node_modules/.prisma node_modules/@prisma/client .prisma && npx prisma generate"
```

### 2. Validate Schema

```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma validate
```

### 3. Check Migration Status

```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate status
```

### 4. Apply Migrations

For development:
```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
```

For production:
```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy
```

## Nuclear Option: Reset Migrations (Development Only)

⚠️ **WARNING**: This will delete all data in your database!

```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate reset --force
```

Then apply migrations fresh:
```bash
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
```

## Rebuild Docker Container

If issues persist, rebuild the container:

```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache backend
docker-compose -f docker-compose.dev.yml up -d
```

Then run migrations:
```bash
npm run docker:migrate:fix
```

## Available Commands

- `npm run docker:migrate` - Apply migrations (production mode)
- `npm run docker:migrate:dev` - Apply migrations (development mode, creates new migration if schema changed)
- `npm run docker:migrate:fix` - Fix migration issues (clears cache, regenerates, applies)
- `npm run docker:migrate:reset` - Reset all migrations (⚠️ deletes data)
- `npm run docker:migrate:status` - Check migration status
- `npm run docker:prisma:generate` - Regenerate Prisma client only

## OpenSSL Warning

The OpenSSL warning is usually harmless but can cause issues. The Dockerfile has been updated to install `openssl1.1-compat` which should resolve most OpenSSL-related problems.

## Still Having Issues?

1. Check database connection:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend sh -c "npx prisma db pull"
   ```

2. Check Prisma version compatibility:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npx prisma --version
   ```

3. Check for duplicate migrations or conflicting migration states

4. Verify DATABASE_URL is correct in docker-compose.dev.yml
