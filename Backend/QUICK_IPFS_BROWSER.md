# Quick Guide: View IPFS in Browser 🚀

## The Easiest Way

After uploading a file to IPFS, you'll get a `gatewayUrl` in the response. **Just copy and paste that URL in your browser!**

## 3 Simple Methods

### Method 1: Use the Gateway URL (Recommended)

1. Upload a file:
   ```bash
   curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
     -H "Content-Type: application/json" \
     -d '{"metadata": {"name": "Test"}}'
   ```

2. Copy the `gatewayUrl` from the response:
   ```json
   {
     "gatewayUrl": "http://localhost:8080/ipfs/QmHash..."
   }
   ```

3. Open in browser: `http://localhost:8080/ipfs/QmHash...`

### Method 2: Use Backend Redirect Endpoint

Just visit:
```
http://localhost:8000/api/ipfs/view/<HASH>
```

This will automatically redirect you to the IPFS gateway!

### Method 3: Direct Gateway Access

If you know the hash, go directly to:
```
http://localhost:8080/ipfs/<HASH>
```

## Quick Test

```bash
# 1. Upload test file
curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "My First IPFS File",
      "description": "Testing browser access"
    }
  }'

# 2. Copy the hash from response (e.g., QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o)

# 3. Open in browser:
# http://localhost:8080/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o
```

## What You'll See

- **JSON files**: Formatted JSON in browser
- **Images**: Image displayed
- **HTML**: Rendered webpage
- **Text**: Plain text
- **Other**: Download prompt

## Troubleshooting

**Can't access?**
1. Make sure Docker is running: `docker ps | grep ipfs`
2. Check IPFS is healthy: `curl http://localhost:8000/api/ipfs/health`
3. Verify gateway: `curl http://localhost:8080/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o`

**File not found?**
- Wait a few seconds after upload
- Check if file is pinned: `curl http://localhost:8000/api/ipfs/check/<HASH>`

## That's It! 🎉

Just use the `gatewayUrl` from any upload response, or visit:
- `http://localhost:8080/ipfs/<HASH>` (direct)
- `http://localhost:8000/api/ipfs/view/<HASH>` (redirect)

For more details, see `IPFS_BROWSER_GUIDE.md`
