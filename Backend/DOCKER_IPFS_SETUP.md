# IPFS Docker Setup Guide

This guide explains how IPFS is configured in the Docker development environment.

## Quick Start

The IPFS service is automatically included when you run:

```bash
npm run docker:dev
```

This will start:
- PostgreSQL database
- IPFS node
- NestJS backend

All services are connected via Docker networking.

## IPFS Service Configuration

The IPFS service is configured in `docker-compose.dev.yml`:

```yaml
ipfs:
  image: ipfs/kubo:latest
  container_name: nexus-ipfs-dev
  ports:
    - "4001:4001"  # Swarm port
    - "5001:5001"  # API port
    - "8080:8080"  # Gateway port
  volumes:
    - ipfs_data_dev:/data/ipfs
    - ipfs_staging_dev:/data/ipfs/staging
  environment:
    - IPFS_PROFILE=server  # Optimized for server use
```

## Backend Configuration

The backend automatically connects to IPFS using Docker service names:

```env
IPFS_MODE=http
IPFS_API_URL=http://ipfs:5001        # Docker service name
IPFS_GATEWAY_URL=http://ipfs:8080    # Docker service name
IPFS_PUBLIC_GATEWAY_URL=http://localhost:8080/ipfs/  # Public access
IPFS_AUTO_PIN=true
```

## Accessing IPFS

### From Host Machine

- **API**: `http://localhost:5001`
- **Gateway**: `http://localhost:8080`
- **Swarm**: `localhost:4001`

### From Backend Container

- **API**: `http://ipfs:5001` (Docker service name)
- **Gateway**: `http://ipfs:8080` (Docker service name)

## Testing IPFS in Docker

### 1. Check IPFS Health

```bash
# From host machine
curl http://localhost:5001/api/v0/id

# From backend container
docker exec nexus-backend-dev curl http://ipfs:5001/api/v0/id
```

### 2. Test Backend IPFS Endpoint

```bash
# Check IPFS service health
curl http://localhost:8000/api/ipfs/health

# Upload metadata
curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "Test Collection",
      "description": "Testing IPFS in Docker"
    },
    "pin": true
  }'
```

### 3. Access IPFS Gateway

After uploading, you can access files via:

```
http://localhost:8080/ipfs/<hash>
```

## IPFS Data Persistence

IPFS data is stored in Docker volumes:

- `ipfs_data_dev`: Main IPFS repository
- `ipfs_staging_dev`: Staging area for uploads

Data persists between container restarts. To reset IPFS:

```bash
docker-compose -f docker-compose.dev.yml down -v
```

⚠️ **Warning**: This will delete all IPFS data!

## Troubleshooting

### IPFS Not Starting

```bash
# Check IPFS logs
docker logs nexus-ipfs-dev

# Check if IPFS is healthy
docker ps  # Look for "healthy" status

# Restart IPFS service
docker-compose -f docker-compose.dev.yml restart ipfs
```

### Backend Can't Connect to IPFS

1. **Check network connectivity**:
   ```bash
   docker exec nexus-backend-dev ping ipfs
   ```

2. **Check IPFS is running**:
   ```bash
   docker exec nexus-ipfs-dev ipfs id
   ```

3. **Check environment variables**:
   ```bash
   docker exec nexus-backend-dev env | grep IPFS
   ```

### IPFS Takes Long to Start

IPFS needs time to initialize (30-60 seconds). The healthcheck has a `start_period` of 30 seconds to account for this.

### Port Already in Use

If ports 4001, 5001, or 8080 are already in use:

1. Find the process:
   ```bash
   # Linux/Mac
   lsof -i :5001
   
   # Windows
   netstat -ano | findstr :5001
   ```

2. Kill the process or change ports in `docker-compose.dev.yml`

## Production Considerations

For production, consider:

1. **Use IPFS pinning service** (Pinata, Web3.Storage) instead of self-hosted
2. **Separate IPFS node** from backend for better scalability
3. **Configure IPFS cluster** for redundancy
4. **Monitor storage usage** - IPFS can grow large
5. **Backup IPFS repository** regularly

## Next Steps

1. ✅ IPFS running in Docker
2. ✅ Backend connected to IPFS
3. 🔄 Test upload/retrieval
4. 🔄 Integrate with Collections service
5. 🔄 Set up monitoring

## Resources

- IPFS Docker Image: https://hub.docker.com/r/ipfs/kubo
- IPFS Documentation: https://docs.ipfs.tech/
- Docker Compose: https://docs.docker.com/compose/
