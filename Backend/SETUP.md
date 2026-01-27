# Backend Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up PostgreSQL

**Option A: Docker (Easiest)**
```bash
docker run --name nexus-postgres \
  -e POSTGRES_PASSWORD=nexus123 \
  -e POSTGRES_DB=nexus_db \
  -p 5432:5432 \
  -d postgres:16
```

**Option B: Supabase (Cloud - Free)**
1. Go to [supabase.com](https://supabase.com)
2. Create account and new project
3. Go to Settings > Database
4. Copy the connection string

### 3. Configure Environment

Copy `env.example` to `.env`:
```bash
# Windows PowerShell
Copy-Item env.example .env

# Or manually create .env with:
DATABASE_URL="postgresql://postgres:nexus123@localhost:5432/nexus_db?schema=public"
PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Run Database Migrations
```bash
npm run prisma:migrate
```
This will create the `Collection` table in your database.

### 6. Start Development Server
```bash
npm run start:dev
```

✅ Backend running on `http://localhost:8000`  
✅ API docs at `http://localhost:8000/api/docs`  
✅ Health check at `http://localhost:8000/health`

---

## Available Endpoints

### Health Check
- `GET /health` - Check if backend and database are running

### Collections
- `GET /api/collections/featured` - Get featured collections
- `GET /api/collections/discover?tab=trending` - Get discover collections (tab: trending, new, ending_soon, free_mint)
- `GET /api/collections?status=minting&search=...&sortBy=newest` - Get all with filters
- `GET /api/collections/:id` - Get single collection

---

## Useful Commands

```bash
# Development
npm run start:dev          # Start with hot reload

# Database
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open visual database editor

# Production
npm run build             # Build for production
npm run start:prod        # Run production build
```

---

## Testing the API

### Using curl:
```bash
# Health check
curl http://localhost:8000/health

# Featured collections
curl http://localhost:8000/api/collections/featured

# Discover (trending)
curl http://localhost:8000/api/collections/discover?tab=trending
```

### Using Swagger UI:
Visit `http://localhost:8000/api/docs` for interactive API documentation.

---

## Adding Test Data

### Option 1: Prisma Studio (Visual)
```bash
npm run prisma:studio
```
Opens a web interface where you can add/edit collections.

### Option 2: SQL (Direct)
Connect to your database and insert:
```sql
INSERT INTO "Collection" (
  id, name, description, "imageUrl", creator, "creatorAddress",
  blockchain, "totalSupply", minted, status, featured, "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Test Collection',
  'A test NFT collection',
  'https://example.com/image.png',
  'Test Creator',
  'SolanaWalletAddress123',
  'solana',
  1000,
  250,
  'minting',
  true,
  NOW(),
  NOW()
);
```

---

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running: `docker ps` (if using Docker)
- Verify `DATABASE_URL` in `.env` is correct
- Ensure database exists: `CREATE DATABASE nexus_db;`

### Prisma Client Not Found
```bash
npm run prisma:generate
```

### Port Already in Use
Change `PORT` in `.env` or kill the process using port 8000.

---

## Next Steps

1. ✅ Backend is running
2. Add test collections via Prisma Studio
3. Test endpoints via Swagger UI
4. Connect frontend to backend
5. Start building features! 🚀

---

*Need help? Check the README.md or DATABASE_RECOMMENDATION.md*
