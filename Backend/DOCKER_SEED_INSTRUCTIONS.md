# Running Seed Scripts in Docker

This guide explains how to run the seed scripts when your backend is running in Docker.

## Prerequisites

- Docker and Docker Compose installed
- Backend container is running (`docker-compose -f docker-compose.dev.yml up` or `npm run docker:dev`)

---

## Quick Commands

### Option 1: Using npm scripts (Recommended)

```bash
# Delete all collections
npm run docker:seed:delete

# Create edge case collections
npm run docker:seed:edge-cases

# Delete then create (full reset)
npm run docker:seed:reset
```

### Option 2: Direct Docker commands

```bash
# Delete all collections
docker-compose -f docker-compose.dev.yml exec backend npx ts-node prisma/delete-collections.ts

# Create edge case collections
docker-compose -f docker-compose.dev.yml exec backend npx ts-node prisma/seed-edge-cases.ts

# Full reset (delete then create)
docker-compose -f docker-compose.dev.yml exec backend sh -c "npx ts-node prisma/delete-collections.ts && npx ts-node prisma/seed-edge-cases.ts"
```

### Option 3: Using docker exec (if container name is known)

```bash
# Delete all collections
docker exec nexus-backend-dev npx ts-node prisma/delete-collections.ts

# Create edge case collections
docker exec nexus-backend-dev npx ts-node prisma/seed-edge-cases.ts

# Full reset
docker exec nexus-backend-dev sh -c "npx ts-node prisma/delete-collections.ts && npx ts-node prisma/seed-edge-cases.ts"
```

---

## Step-by-Step Guide

### 1. Make sure Docker containers are running

```bash
cd Backend
docker-compose -f docker-compose.dev.yml up -d
```

Or if using npm:
```bash
npm run docker:dev
```

### 2. Run database migration (if mintStart field was added)

```bash
# Run migration to add mintStart field
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name add_mint_start

# Or if migrations are already applied, just generate Prisma client
docker-compose -f docker-compose.dev.yml exec backend npx prisma generate
```

### 3. Check container is running

```bash
docker ps
```

You should see `nexus-backend-dev` and `nexus-postgres-dev` containers.

### 4. Run seed scripts

**Delete existing collections:**
```bash
npm run docker:seed:delete
```

**Create edge case collections:**
```bash
npm run docker:seed:edge-cases
```

**Or do both at once:**
```bash
npm run docker:seed:reset
```

---

## Troubleshooting

### Container not found

If you get "container not found" error:
```bash
# Check container name
docker ps

# Use the correct container name
docker exec <container-name> npx ts-node prisma/delete-collections.ts
```

### Permission errors

If you get permission errors:
```bash
# Make sure you're in the Backend directory
cd Backend

# Check Docker is running
docker ps
```

### Script not found

If TypeScript files aren't found:
```bash
# Make sure you're using the correct path
docker-compose -f docker-compose.dev.yml exec backend ls prisma/

# Should show: delete-collections.ts, seed-edge-cases.ts, seed.ts
```

### Database connection errors

If you get database connection errors:
```bash
# Check database is running
docker ps | grep postgres

# Check database connection from container
docker-compose -f docker-compose.dev.yml exec backend npx prisma db pull
```

---

## Alternative: Run in one-off container

If the backend container isn't running, you can run seed scripts in a temporary container:

```bash
# Delete collections
docker-compose -f docker-compose.dev.yml run --rm backend npx ts-node prisma/delete-collections.ts

# Create edge cases
docker-compose -f docker-compose.dev.yml run --rm backend npx ts-node prisma/seed-edge-cases.ts

# Full reset
docker-compose -f docker-compose.dev.yml run --rm backend sh -c "npx ts-node prisma/delete-collections.ts && npx ts-node prisma/seed-edge-cases.ts"
```

**Note:** Using `run --rm` creates a temporary container that is removed after execution. This is useful if your main backend container isn't running.

---

## Verify Results

After seeding, verify the collections were created:

```bash
# Check via API (if backend is running)
curl http://localhost:8000/api/collections

# Or check database directly
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d nexus_db -c "SELECT COUNT(*) FROM \"Collection\";"
```

---

## Summary

**Easiest way:**
```bash
cd Backend
npm run docker:seed:reset
```

This will:
1. Delete all existing collections
2. Create 25 edge case collections for drop page testing
3. All collections have profile pictures and banner images from placehold.co

**Last Updated:** January 27, 2026
