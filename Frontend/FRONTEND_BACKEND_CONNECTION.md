# Frontend-Backend Connection Guide

## ✅ What's Connected

The homepage is now fully connected to the backend API:

- ✅ **HeroSection** - Fetches featured collections from `/api/collections/featured`
- ✅ **FeaturedDropsGrid** - Uses featured collections (filtered for minting)
- ✅ **HotCollections** - Uses featured collections (top 5)
- ✅ **DiscoverSection** - Fetches collections from `/api/collections/discover?tab=...`

## Environment Setup

Create `.env.local` in the `Frontend` directory:

```env
# Backend API URL (server-side only, not exposed to client)
# This is used by Next.js API routes to proxy requests
BACKEND_URL=http://localhost:8000

# API Key for Next.js API routes (server-side only)
# This is the key that validates requests to your Next.js API routes
# Generate a strong random string: openssl rand -hex 32
API_KEY=your_secure_api_key_here

# Backend API Key (optional, if backend requires API key)
# This is sent to the backend when proxying requests
BACKEND_API_KEY=your_backend_api_key_here

# Frontend API Key (client-side, safe to expose)
# This is the key the frontend sends to Next.js API routes
# Can be the same as API_KEY or different for additional security
NEXT_PUBLIC_API_KEY=your_secure_api_key_here

# Phantom Wallet (optional)
NEXT_PUBLIC_PHANTOM_APP_ID=your_phantom_app_id_here
```

**Important:** 
- `BACKEND_URL` is server-side only and never exposed to the client
- `API_KEY` is server-side only and validates requests to Next.js API routes
- `NEXT_PUBLIC_API_KEY` is client-side and sent with every request
- `BACKEND_API_KEY` is optional, only if your backend requires API key authentication

**Security Note:** In production, generate strong random API keys:
```bash
# Generate a secure API key
openssl rand -hex 32
```

## How It Works

1. **API Client** (`lib/api/client.ts`)
   - Handles all API calls from frontend
   - No API key needed (frontend is trusted)
   - Error handling built-in
   - Returns typed responses

2. **Next.js API Routes** (`app/api/collections/*`)
   - Proxy requests to the backend
   - Hide backend URL from client
   - Automatically forward backend API key if configured
   - No API key validation (frontend is trusted)

3. **Backend API Key** (`lib/api/auth.ts`)
   - Gets backend API key from environment
   - Sent to backend in `x-api-key` header
   - Backend (NestJS) validates the API key

4. **React Query Hooks** (`hooks/useCollections.ts`)
   - `useFeaturedCollections()` - For Hero, Featured, Hot
   - `useDiscoverCollections(tab)` - For Discover tabs
   - Automatic caching and refetching

5. **Components Updated**
   - All components accept `collections` prop
   - Fallback to empty array if no data
   - Loading and error states handled

## Testing

1. Make sure backend is running:
   ```bash
   cd Backend
   npm run docker:dev
   ```

2. Start frontend:
   ```bash
   cd Frontend
   npm run dev
   ```

3. Visit `http://localhost:3000`

You should see real data from the backend! 🎉

## API Endpoints

### Frontend (Next.js API Routes - what the client calls)
- `GET /api/collections/featured` - Featured collections
- `GET /api/collections/discover?tab=trending` - Trending
- `GET /api/collections/discover?tab=new` - New
- `GET /api/collections/discover?tab=ending_soon` - Ending Soon
- `GET /api/collections/discover?tab=free_mint` - Free Mint
- `GET /api/collections/[id]` - Single collection

### Backend (proxied by Next.js - hidden from client)
- `GET http://localhost:8000/api/collections/featured`
- `GET http://localhost:8000/api/collections/discover?tab=...`
- `GET http://localhost:8000/api/collections/[id]`

**Note:** The backend URL is never exposed to the client. All requests go through Next.js API routes.

---

*Frontend and backend are now best friends!* 🤝
