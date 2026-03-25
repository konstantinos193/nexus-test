# Viewing IPFS Content in Browser

This guide shows you how to access and view IPFS files in your browser.

## Quick Access Methods

### Method 1: Direct IPFS Gateway (Easiest)

Your IPFS gateway is exposed on port **8080**. Access any IPFS file directly:

```
http://localhost:8080/ipfs/<HASH>
```

**Example:**
- If you uploaded a file and got hash `QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o`
- Open in browser: `http://localhost:8080/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o`

### Method 2: Through Backend API

The backend returns `gatewayUrl` in all upload responses. Use that URL directly in your browser.

### Method 3: IPFS Web UI (Optional)

You can also access the IPFS Web UI if you enable it (see below).

## Step-by-Step: View IPFS Content

### Step 1: Upload a Test File

```bash
# Upload test metadata
curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "Test Collection",
      "description": "My first IPFS upload",
      "image": "https://example.com/image.png"
    },
    "pin": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hash": "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "path": "ipfs://QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "gatewayUrl": "http://localhost:8080/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    "size": 1234,
    "pinned": true
  }
}
```

### Step 2: Open in Browser

Copy the `gatewayUrl` from the response and paste it in your browser:

```
http://localhost:8080/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o
```

The browser will display:
- **JSON files**: Formatted JSON (if browser supports it)
- **Images**: Display the image
- **Text files**: Display as text
- **Other files**: Download or display based on content type

## Viewing Different File Types

### JSON Metadata

```bash
# Upload JSON
curl -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"name": "Test"}}'

# Open in browser: http://localhost:8080/ipfs/<HASH>
# Browser will show formatted JSON
```

### Images

```bash
# Upload image file
curl -X POST http://localhost:8000/api/ipfs/upload/file \
  -F "file=@image.png" \
  -F "pin=true"

# Open in browser: http://localhost:8080/ipfs/<HASH>
# Browser will display the image
```

### HTML Files

```bash
# Upload HTML
curl -X POST http://localhost:8000/api/ipfs/upload/file \
  -F "file=@index.html" \
  -F "pin=true"

# Open in browser: http://localhost:8080/ipfs/<HASH>
# Browser will render the HTML
```

## Using the Backend View Endpoint

The backend provides a convenient endpoint to view IPFS content:

```
GET http://localhost:8000/api/ipfs/view/<HASH>
```

This endpoint:
- Retrieves the file from IPFS
- Returns it with proper content-type headers
- Works great for JSON metadata (formatted response)

**Example:**
```bash
# Get metadata via backend
curl http://localhost:8000/api/ipfs/metadata/<HASH>

# Or open in browser
http://localhost:8000/api/ipfs/metadata/<HASH>
```

## Public Gateway Access

If you want to share IPFS content publicly (outside your local network), you can use:

1. **Your own public gateway** (if you expose port 8080)
2. **Public IPFS gateways**:
   - `https://ipfs.io/ipfs/<HASH>`
   - `https://gateway.pinata.cloud/ipfs/<HASH>`
   - `https://cloudflare-ipfs.com/ipfs/<HASH>`

**Note:** The file must be pinned and available on the IPFS network for public gateways to work.

## Troubleshooting

### "Cannot GET /ipfs/..."

**Problem:** IPFS gateway not responding

**Solution:**
1. Check IPFS container is running: `docker ps | grep ipfs`
2. Check IPFS logs: `docker logs nexus-ipfs-dev`
3. Verify gateway is accessible: `curl http://localhost:8080/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o`

### File Not Found

**Problem:** File exists but gateway can't find it

**Solution:**
1. Verify file is pinned: `curl http://localhost:8000/api/ipfs/check/<HASH>`
2. Check if file was uploaded: `curl http://localhost:5001/api/v0/pin/ls`
3. Wait a few seconds for IPFS to index the file

### CORS Errors

**Problem:** Browser blocks requests due to CORS

**Solution:**
1. IPFS gateway CORS is enabled by default
2. If issues persist, check IPFS gateway configuration
3. Use the backend API endpoint instead (no CORS issues)

## Advanced: IPFS Web UI

To enable IPFS Web UI (optional):

1. **Access Web UI:**
   ```
   http://localhost:5001/webui
   ```

2. **Or use IPFS Desktop** (if installed locally):
   - Launch IPFS Desktop
   - Click "Web UI" button
   - Browse files, view stats, manage pins

## Quick Reference

| Method | URL Format | Use Case |
|--------|------------|----------|
| Direct Gateway | `http://localhost:8080/ipfs/<HASH>` | Quick viewing, images, HTML |
| Backend API | `http://localhost:8000/api/ipfs/metadata/<HASH>` | JSON metadata, API integration |
| Public Gateway | `https://ipfs.io/ipfs/<HASH>` | Sharing publicly |
| Web UI | `http://localhost:5001/webui` | Managing IPFS node |

## Example Workflow

```bash
# 1. Upload metadata
RESPONSE=$(curl -s -X POST http://localhost:8000/api/ipfs/upload/metadata \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"name": "My NFT", "description": "Cool NFT"}}')

# 2. Extract hash
HASH=$(echo $RESPONSE | jq -r '.data.hash')

# 3. Open in browser (Linux/Mac)
xdg-open "http://localhost:8080/ipfs/$HASH"
# Or on Windows:
start "http://localhost:8080/ipfs/$HASH"
# Or on Mac:
open "http://localhost:8080/ipfs/$HASH"
```

## Tips

1. **Bookmark the gateway**: `http://localhost:8080/ipfs/` for quick access
2. **Use browser extensions**: Some browsers have IPFS extensions for better support
3. **Check content type**: IPFS gateway serves files with proper MIME types
4. **Share hashes**: You can share just the hash, others can use any gateway
5. **Pin important files**: Unpinned files may disappear

## Next Steps

- ✅ View IPFS content in browser
- 🔄 Integrate IPFS URLs in your frontend
- 🔄 Add IPFS image previews
- 🔄 Create IPFS content browser UI
