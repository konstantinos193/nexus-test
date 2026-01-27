# NeXus NFT Launchpad Backend

**NestJS + PostgreSQL + Prisma** - The best stack for NFT launchpads.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database

**Option A: Docker (Recommended)**
```bash
docker run --name nexus-postgres \
  -e POSTGRES_PASSWORD=nexus123 \
  -e POSTGRES_DB=nexus_db \
  -p 5432:5432 \
  -d postgres:16
```

**Option B: Supabase (Cloud)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string

### 3. Configure Environment
Create `.env` file (or copy from `env.example`):
```env
DATABASE_URL="postgresql://postgres:nexus123@localhost:5432/nexus_db?schema=public"
PORT=8000
FRONTEND_URL=http://localhost:3000

# Solana Configuration (Devnet)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
```

### 4. Run Migrations
```bash
npm run prisma:migrate
```

### 5. Start Development Server
```bash
npm run start:dev
```

Backend runs on `http://localhost:8000`  
API docs at `http://localhost:8000/api/docs`

---

## Available Scripts

- `npm run start:dev` - Start dev server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (visual DB editor)
- `npm run prisma:generate` - Generate Prisma Client

---

## API Endpoints

### Health
- `GET /health` - Health check (includes database and Solana status)

### Collections
- `GET /api/collections/featured` - Get featured collections
- `GET /api/collections/discover?tab=trending` - Get discover collections
- `GET /api/collections?status=minting&search=...&sortBy=newest` - Get all with filters
- `GET /api/collections/:id` - Get single collection

### Solana
- `GET /api/solana/network` - Get Solana network information
- `GET /api/solana/balance/:address` - Get account balance
- `GET /api/solana/validate-address/:address` - Validate Solana address
- `GET /api/solana/verify-transaction/:signature` - Verify transaction

All endpoints return:
```json
{
  "success": true,
  "data": [...]
}
```

---

## Tech Stack

- **Framework**: NestJS (TypeScript-first)
- **Database**: PostgreSQL (best for NFT apps)
- **ORM**: Prisma (type-safe queries)
- **Blockchain**: Solana (Web3.js + Metaplex)
- **API Docs**: Swagger/OpenAPI

---

## Project Structure

```
Backend/
├── src/
│   ├── collections/        # Collections feature
│   ├── database/           # Prisma service
│   ├── solana/             # Solana blockchain integration
│   ├── health/             # Health check endpoints
│   ├── app.module.ts       # Root module
│   └── main.ts             # Entry point
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
```

---

## Database

**PostgreSQL** - The best database for NFT launchpads:
- ✅ JSON support for NFT traits
- ✅ Full-text search
- ✅ Complex queries & filters
- ✅ ACID compliance
- ✅ Production-ready

See `DATABASE_RECOMMENDATION.md` for details.

---

## Docker Setup (Recommended)

### Quick Start with Docker

```bash
# Development (with hot reload)
npm run docker:dev

# Production
npm run docker:prod
```

See `DOCKER.md` for detailed Docker instructions.

---

## Next Steps

1. Set up PostgreSQL (Docker or Supabase)
2. Configure `.env` file
3. Run migrations
4. Start coding! 🚀

---

*Built with NestJS - because TypeScript deserves the best.*
