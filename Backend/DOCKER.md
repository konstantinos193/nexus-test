# Docker Setup Guide

## ⚠️ Prerequisites

**Docker Desktop must be running!**

Before starting, ensure Docker Desktop is installed and running on your machine:
- Windows: Open Docker Desktop application and wait for it to fully start
- Check it's running: `docker ps` should work without errors

If you see "The system cannot find the file specified" error, Docker Desktop is not running.

---

## Quick Start

### Development (Hot Reload)

```bash
# Start everything (database + backend)
docker-compose -f docker-compose.dev.yml up

# Or in detached mode
docker-compose -f docker-compose.dev.yml up -d
```

✅ Backend: `http://localhost:8000`  
✅ Database: `localhost:5432`  
✅ API Docs: `http://localhost:8000/api/docs`

### Production

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f backend
```

---

## Available Commands

### Development

```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Rebuild after code changes
docker-compose -f docker-compose.dev.yml up --build

# Access backend container shell
docker exec -it nexus-backend-dev sh

# Access database
docker exec -it nexus-postgres-dev psql -U postgres -d nexus_db
```

### Production

```bash
# Build and start
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

---

## Database Management

### Run Migrations

**Development:**
```bash
# Migrations run automatically on startup
# Or manually:
docker exec -it nexus-backend-dev npm run prisma:migrate
```

**Production:**
```bash
# Migrations run automatically on startup
# Or manually:
docker exec -it nexus-backend npx prisma migrate deploy
```

### Prisma Studio

```bash
# Development
docker exec -it nexus-backend-dev npm run prisma:studio

# Then access at http://localhost:5555
# (You may need to port-forward: docker port nexus-backend-dev)
```

### Database Backup

```bash
# Backup
docker exec nexus-postgres-dev pg_dump -U postgres nexus_db > backup.sql

# Restore
docker exec -i nexus-postgres-dev psql -U postgres nexus_db < backup.sql
```

---

## Environment Variables

### Development

Edit `docker-compose.dev.yml` to change:
- `DATABASE_URL`
- `PORT`
- `FRONTEND_URL`

### Production

Create `.env` file or edit `docker-compose.yml`:
```env
DATABASE_URL=postgresql://postgres:nexus123@postgres:5432/nexus_db?schema=public
PORT=8000
FRONTEND_URL=http://localhost:3000
```

---

## Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

### Database Connection Issues

```bash
# Check if database is running
docker ps

# Check database logs
docker-compose logs postgres

# Test connection
docker exec -it nexus-postgres-dev psql -U postgres -d nexus_db
```

### Rebuild Everything

```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker rmi nexus-backend nexus-backend-dev

# Rebuild
docker-compose -f docker-compose.dev.yml up --build
```

### Clear Database

```bash
# Stop services
docker-compose down

# Remove volume
docker volume rm backend_postgres_data_dev

# Start again (fresh database)
docker-compose -f docker-compose.dev.yml up
```

---

## File Structure

```
Backend/
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Production setup
├── docker-compose.dev.yml  # Development setup
└── .dockerignore          # Files to exclude from Docker
```

---

## What's Included

### Services

1. **PostgreSQL 16** - Database
   - Port: 5432
   - Database: nexus_db
   - User: postgres
   - Password: nexus123

2. **NestJS Backend** - API Server
   - Port: 8000
   - Auto-migrations on startup
   - Hot reload in development

### Volumes

- `postgres_data` - Database persistence
- Source code mounted in dev mode for hot reload

### Networks

- `nexus-network` - Internal network for services

---

## Production Deployment

### Build Image

```bash
docker build -t nexus-backend:latest .
```

### Run with Docker

```bash
docker run -d \
  --name nexus-backend \
  -p 8000:8000 \
  --env-file .env \
  --network nexus-network \
  nexus-backend:latest
```

### Or Use Docker Compose

```bash
docker-compose up -d
```

---

## Next Steps

1. ✅ Docker setup complete
2. Run `docker-compose -f docker-compose.dev.yml up`
3. Wait for migrations to complete
4. Access API at `http://localhost:8000`
5. Add test data via Prisma Studio
6. Connect frontend! 🚀

---

*Docker makes deployment easy. One command, everything runs.* 🐳
