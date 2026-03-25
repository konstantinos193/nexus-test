# IPFS Setup Guide

This guide explains how to set up your own IPFS node for the NeXus NFT Launchpad backend.

## Quick Start

### 1. Install IPFS

**Option A: IPFS Desktop (Easiest)**
- Download from: https://docs.ipfs.tech/install/ipfs-desktop/
- Install and launch the application
- IPFS will start automatically

**Option B: IPFS CLI**
```bash
# macOS
brew install ipfs

# Linux
# Download from https://dist.ipfs.tech/#kubo
# Or use package manager

# Windows
# Download from https://dist.ipfs.tech/#kubo
```

### 2. Initialize IPFS (First Time Only)

```bash
ipfs init
```

### 3. Start IPFS Node

```bash
# Start IPFS daemon
ipfs daemon
```

The daemon will start and expose:
- API: `http://localhost:5001`
- Gateway: `http://localhost:8080`

### 4. Configure Backend

Add to your `.env` file:

```env
IPFS_MODE=http
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080
IPFS_PUBLIC_GATEWAY_URL=https://ipfs.io/ipfs/
IPFS_AUTO_PIN=true
```

### 5. Verify Setup

```bash
# Check IPFS node is running
curl http://localhost:5001/api/v0/id

# Check backend health
curl http://localhost:8000/api/ipfs/health
```

## Docker Setup (Recommended for Production)

### docker-compose.yml

Add this to your existing `docker-compose.dev.yml`:

```yaml
services:
  ipfs:
    image: ipfs/kubo:latest
    container_name: nexus-ipfs
    ports:
      - "4001:4001"  # Swarm port
      - "5001:5001"  # API port
      - "8080:8080"  # Gateway port
    volumes:
      - ipfs-data:/data/ipfs
      - ipfs-staging:/data/ipfs/staging
    environment:
      - IPFS_PROFILE=server  # Optimize for server use
    restart: unless-stopped

volumes:
  ipfs-data:
  ipfs-staging:
```

### Update Backend Configuration

In your backend `.env`:

```env
IPFS_API_URL=http://ipfs:5001
IPFS_GATEWAY_URL=http://ipfs:8080
```

## Production Considerations

### 1. Storage

IPFS nodes store all pinned content locally. Plan for:
- **Storage growth**: IPFS nodes grow as you pin more content
- **Disk space**: Ensure adequate storage for your use case
- **Backup**: Consider backing up your IPFS repository

### 2. Performance

- **Server profile**: Use `IPFS_PROFILE=server` for better performance
- **Resource limits**: Monitor CPU and memory usage
- **Network**: Ensure good network connectivity for IPFS swarm

### 3. Security

- **API access**: Restrict API access (default: localhost only)
- **Gateway access**: Configure CORS if needed
- **Firewall**: Only expose necessary ports

### 4. Pinning Strategy

- **Auto-pin**: Enable `IPFS_AUTO_PIN=true` for important files
- **Manual pinning**: Pin critical metadata manually
- **Unpinning**: Unpin old/unused content to save space

## Using IPFS Pinning Services

For production, consider using a pinning service:

### Pinata

1. Sign up at https://pinata.cloud
2. Get API key from dashboard
3. Configure:

```env
IPFS_MODE=http
IPFS_API_URL=https://api.pinata.cloud
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
IPFS_PUBLIC_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
IPFS_API_KEY=your_pinata_jwt_token
```

### Web3.Storage

1. Sign up at https://web3.storage
2. Get API token
3. Configure:

```env
IPFS_MODE=http
IPFS_API_URL=https://api.web3.storage
IPFS_GATEWAY_URL=https://w3s.link/ipfs/
IPFS_PUBLIC_GATEWAY_URL=https://w3s.link/ipfs/
IPFS_API_KEY=your_web3_storage_token
```

## Testing

### Test Upload

```bash
# Upload metadata
curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "Test Collection",
      "description": "Testing IPFS",
      "image": "https://example.com/image.png"
    },
    "pin": true
  }'
```

### Test Retrieval

```bash
# Replace HASH with the hash from upload response
curl http://localhost:8000/api/ipfs/metadata/HASH
```

## Troubleshooting

### IPFS node not starting

```bash
# Check if port is already in use
lsof -i :5001

# Kill existing process if needed
kill -9 <PID>

# Restart IPFS
ipfs daemon
```

### Connection refused

- Verify IPFS daemon is running: `ipfs daemon`
- Check API URL in `.env` matches IPFS configuration
- Verify firewall isn't blocking port 5001

### Files not persisting

- Enable auto-pinning: `IPFS_AUTO_PIN=true`
- Manually pin important files
- Check IPFS node storage space

### High storage usage

```bash
# Check IPFS repo size
ipfs repo stat

# List pinned files
ipfs pin ls

# Unpin old files (be careful!)
ipfs pin rm <hash>
```

## Next Steps

1. ✅ IPFS node running
2. ✅ Backend configured
3. ✅ Test upload/retrieval
4. 🔄 Integrate with Collections service
5. 🔄 Set up monitoring
6. 🔄 Configure backups

## Resources

- IPFS Documentation: https://docs.ipfs.tech/
- IPFS HTTP API: https://docs.ipfs.tech/reference/kubo/rpc/
- Pinata: https://pinata.cloud
- Web3.Storage: https://web3.storage
