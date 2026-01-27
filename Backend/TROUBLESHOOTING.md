# Troubleshooting Guide

## Docker Issues

### Error: "The system cannot find the file specified" / "dockerDesktopLinuxEngine"

**Problem:** Docker Desktop is not running on Windows.

**Solution:**
1. Open **Docker Desktop** application
2. Wait for it to fully start (whale icon in system tray should be steady)
3. Verify it's running: Open PowerShell and run:
   ```powershell
   docker ps
   ```
   If it works, Docker is running. If you get an error, Docker Desktop isn't started yet.

4. Once Docker Desktop is running, try again:
   ```bash
   npm run docker:dev
   ```

---

### Error: "Port already in use"

**Problem:** Port 8000 or 5432 is already being used by another application.

**Solution:**

**Option 1: Find and stop the process using the port**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Find process using port 5432
netstat -ano | findstr :5432

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

**Option 2: Change ports in docker-compose.dev.yml**
```yaml
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

---

### Error: "Cannot connect to Docker daemon"

**Problem:** Docker Desktop is not running or Docker service is stopped.

**Solution:**
1. Start Docker Desktop
2. Check Docker service:
   ```powershell
   # Check if Docker is running
   docker version
   ```
3. If still not working, restart Docker Desktop

---

### Error: "Database connection refused"

**Problem:** Database container isn't ready yet or connection string is wrong.

**Solution:**
1. Check if containers are running:
   ```powershell
   docker ps
   ```
2. Check database logs:
   ```powershell
   docker-compose -f docker-compose.dev.yml logs postgres
   ```
3. Wait a few seconds after starting - database needs time to initialize
4. Verify DATABASE_URL in docker-compose.dev.yml matches the postgres service

---

### Error: "Prisma migrate failed"

**Problem:** Database isn't ready or migrations already exist.

**Solution:**
1. Check database is healthy:
   ```powershell
   docker-compose -f docker-compose.dev.yml ps
   ```
2. If migrations already exist, use:
   ```powershell
   docker exec -it nexus-backend-dev npx prisma migrate deploy
   ```
3. Or reset database:
   ```powershell
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up
   ```

---

### Error: "Container name already exists"

**Problem:** Old containers with same names still exist.

**Solution:**
```powershell
# Stop and remove old containers
docker-compose -f docker-compose.dev.yml down

# Remove specific container
docker rm -f nexus-backend-dev
docker rm -f nexus-postgres-dev

# Start fresh
npm run docker:dev
```

---

### Error: "Build failed" or "npm install failed"

**Problem:** Network issues or corrupted cache.

**Solution:**
1. Clear Docker build cache:
   ```powershell
   docker builder prune
   ```
2. Rebuild without cache:
   ```powershell
   docker-compose -f docker-compose.dev.yml build --no-cache
   ```
3. Check internet connection for npm install

---

## General Issues

### Backend won't start

**Check logs:**
```powershell
docker-compose -f docker-compose.dev.yml logs backend
```

**Common causes:**
- Database not ready (wait 10-20 seconds)
- Missing environment variables
- Port conflicts
- Prisma Client not generated

---

### Database data lost after restart

**Problem:** Volume not persisting.

**Solution:**
1. Check volumes exist:
   ```powershell
   docker volume ls
   ```
2. Don't use `docker-compose down -v` (this deletes volumes)
3. Use `docker-compose down` to preserve data

---

### Can't access API from browser

**Check:**
1. Backend is running: `docker ps`
2. Port is correct: `http://localhost:8000`
3. Check logs for errors: `docker-compose logs backend`
4. Try health endpoint: `http://localhost:8000/health`

---

### Prisma Studio won't open

**Problem:** Port 5555 might be blocked or container issue.

**Solution:**
```powershell
# Run Prisma Studio in container
docker exec -it nexus-backend-dev npm run prisma:studio

# Or expose port in docker-compose.dev.yml:
ports:
  - "8000:8000"
  - "5555:5555"  # Add this
```

---

## Quick Fixes

### Reset Everything
```powershell
# Stop everything
docker-compose -f docker-compose.dev.yml down -v

# Remove images
docker rmi backend-backend backend-postgres

# Start fresh
npm run docker:dev
```

### Check Docker Status
```powershell
# Docker version
docker version

# Docker info
docker info

# Running containers
docker ps

# All containers (including stopped)
docker ps -a
```

### View All Logs
```powershell
# All services
docker-compose -f docker-compose.dev.yml logs

# Follow logs
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
```

---

## Still Having Issues?

1. **Check Docker Desktop is running** (most common issue)
2. **Check ports are available** (8000, 5432)
3. **Check logs** for specific error messages
4. **Restart Docker Desktop** if nothing works
5. **Check Windows WSL2** is enabled (if using WSL2 backend)

---

*Most issues are solved by ensuring Docker Desktop is running!* 🐳
