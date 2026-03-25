# IPFS Module

Complete IPFS integration for the NeXus NFT Launchpad backend. This module provides services for uploading, pinning, and retrieving files from IPFS.

## Features

- ✅ Upload files and JSON metadata to IPFS
- ✅ Pin/unpin files for persistence
- ✅ Retrieve files and metadata from IPFS
- ✅ HTTP client mode (connects to existing IPFS node)
- ✅ Automatic pinning configuration
- ✅ Gateway URL generation
- ✅ REST API endpoints for all operations
- ✅ Health check endpoint

## Setup

### Option 1: Run Your Own IPFS Node (Recommended)

1. **Install IPFS Desktop or IPFS CLI**
   - Desktop: https://docs.ipfs.tech/install/ipfs-desktop/
   - CLI: https://docs.ipfs.tech/install/command-line/

2. **Start IPFS Node**
   ```bash
   # If using IPFS Desktop, just launch the app
   # If using CLI:
   ipfs daemon
   ```

3. **Configure Backend**
   Add to your `.env` file:
   ```env
   IPFS_MODE=http
   IPFS_API_URL=http://localhost:5001
   IPFS_GATEWAY_URL=http://localhost:8080
   IPFS_PUBLIC_GATEWAY_URL=https://ipfs.io/ipfs/
   IPFS_AUTO_PIN=true
   ```

4. **Verify Connection**
   ```bash
   curl http://localhost:5001/api/v0/id
   ```

### Option 2: Use IPFS Pinning Service (Pinata, Web3.Storage, etc.)

1. **Sign up for a pinning service** (e.g., Pinata)

2. **Get API credentials**

3. **Configure Backend**
   ```env
   IPFS_MODE=http
   IPFS_API_URL=https://api.pinata.cloud
   IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
   IPFS_PUBLIC_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
   IPFS_API_KEY=your_pinata_api_key
   IPFS_AUTO_PIN=true
   ```

### Option 3: Use Public IPFS Gateway (Not Recommended for Production)

You can use public gateways like `ipfs.io`, but this is **not recommended** for production because:
- No control over pinning
- Files may not be available if not pinned
- Rate limiting issues

## Usage

### In Your Services

```typescript
import { Injectable } from '@nestjs/common';
import { IpfsService } from '../ipfs/ipfs.service';

@Injectable()
export class MyService {
  constructor(private ipfsService: IpfsService) {}

  async uploadCollectionMetadata(metadata: any) {
    // Upload metadata to IPFS
    const result = await this.ipfsService.uploadMetadata(metadata, true);
    
    // result contains:
    // - hash: IPFS hash (CID)
    // - path: ipfs://hash
    // - gatewayUrl: https://ipfs.io/ipfs/hash
    // - size: file size in bytes
    // - pinned: whether file is pinned
    
    return result;
  }

  async retrieveMetadata(hash: string) {
    const metadata = await this.ipfsService.getMetadata(hash);
    return metadata;
  }
}
```

### REST API Endpoints

All endpoints are prefixed with `/api/ipfs`:

- `GET /api/ipfs/health` - Check IPFS service health
- `POST /api/ipfs/upload/metadata` - Upload JSON metadata
- `POST /api/ipfs/upload/file` - Upload a file
- `POST /api/ipfs/pin/:hash` - Pin a file by hash
- `POST /api/ipfs/unpin/:hash` - Unpin a file by hash
- `GET /api/ipfs/check/:hash` - Check if file is pinned
- `GET /api/ipfs/retrieve/:hash` - Retrieve file content
- `GET /api/ipfs/metadata/:hash` - Retrieve JSON metadata
- `GET /api/ipfs/info` - Get IPFS node information

### Example: Upload Metadata

```bash
curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "My NFT Collection",
      "description": "A cool collection",
      "image": "ipfs://QmHash..."
    },
    "pin": true
  }'
```

### Example: Upload File

```bash
curl -X POST http://localhost:8000/api/ipfs/upload/file \
  -F "file=@metadata.json" \
  -F "pin=true"
```

## Integration with Collections

The IPFS service can be integrated with the Collections service to store metadata:

```typescript
// In collections.service.ts
async createCollection(data: CreateCollectionDto) {
  // Upload metadata to IPFS
  const ipfsResult = await this.ipfsService.uploadMetadata({
    name: data.name,
    description: data.description,
    image: data.imageUrl,
    // ... other metadata
  });

  // Save collection with IPFS hash
  const collection = await this.prisma.collection.create({
    data: {
      ...data,
      ipfsHash: ipfsResult.hash,
    },
  });

  return collection;
}
```

## Configuration

All configuration is done via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `IPFS_MODE` | `http` | Mode: `http` or `local` (local not yet implemented) |
| `IPFS_API_URL` | `http://localhost:5001` | IPFS node API endpoint |
| `IPFS_GATEWAY_URL` | `http://localhost:8080` | IPFS gateway URL |
| `IPFS_PUBLIC_GATEWAY_URL` | `https://ipfs.io/ipfs/` | Public gateway URL for sharing |
| `IPFS_API_KEY` | - | Optional API key for authenticated nodes |
| `IPFS_AUTO_PIN` | `true` | Automatically pin uploaded files |
| `IPFS_PIN_TIMEOUT` | `30000` | Pin timeout in milliseconds |
| `IPFS_GATEWAY_CORS` | `true` | Enable CORS on gateway |

## Docker Setup

If running IPFS in Docker, you can add it to your `docker-compose.yml`:

```yaml
services:
  ipfs:
    image: ipfs/kubo:latest
    ports:
      - "4001:4001"  # Swarm
      - "5001:5001"  # API
      - "8080:8080"  # Gateway
    volumes:
      - ipfs-data:/data/ipfs
    environment:
      - IPFS_PROFILE=server

volumes:
  ipfs-data:
```

Then update your backend `.env`:
```env
IPFS_API_URL=http://ipfs:5001
IPFS_GATEWAY_URL=http://ipfs:8080
```

## Troubleshooting

### IPFS service not initialized

**Error**: `IPFS service is not initialized. Check your IPFS node is running.`

**Solution**: 
1. Make sure your IPFS node is running
2. Check `IPFS_API_URL` is correct
3. Verify you can access the API: `curl http://localhost:5001/api/v0/id`

### Connection timeout

**Error**: `Failed to connect to IPFS node`

**Solution**:
1. Check firewall settings
2. Verify IPFS node is accessible
3. Check network connectivity

### Files not persisting

**Problem**: Files disappear after some time

**Solution**:
1. Enable auto-pinning: `IPFS_AUTO_PIN=true`
2. Manually pin important files using the pin endpoint
3. Consider using a pinning service for production

## Best Practices

1. **Always pin important files** - Unpinned files may be garbage collected
2. **Use your own IPFS node** - Don't rely on public gateways for production
3. **Monitor storage** - IPFS nodes can grow large over time
4. **Backup important hashes** - Store IPFS hashes in your database
5. **Use CIDv1** - Better compatibility (already configured)

## Future Enhancements

- [ ] Local IPFS node mode (run IPFS in-process)
- [ ] Batch upload support
- [ ] File streaming for large files
- [ ] IPFS cluster support
- [ ] Automatic garbage collection management
- [ ] Metrics and monitoring
