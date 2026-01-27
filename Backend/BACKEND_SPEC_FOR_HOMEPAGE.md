# Backend Spec: What to Build for the Home Page (and Related Frontend) to Work

This document describes what you need to create in **Backend** so that the **Frontend** home page (`app/page.tsx`) and its sections work with real data instead of mocks.

---

## 1. Current Frontend Data Flow

The home page renders `HomePageContent`, which includes:

| Section | Data source (current) | Used for |
|--------|------------------------|----------|
| **HeroSection** | `featuredCollections` | Carousel of up to 5 collections (prefer `minting`) |
| **FeaturedDropsGrid** | `featuredCollections` (minting only) | Grid of up to 2 featured drops with mint stats |
| **HotCollections** | `featuredCollections` | Horizontal row of top 5 “hot” collections |
| **DiscoverSection** | `discoverCollections` | Tabs: **Trending** \| **New** \| **Ending Soon** \| **Free Mint**, max 6 cards per tab |

Links from the home page go to:

- **Hero, FeaturedDrops, HotCollections** → `/drops/{collectionId}`
- **DiscoverSection** (via `CollectionCard`) → `/collections/{collectionId}`

The **collections page** (`/collections`) uses `mockCollections` for the full browse list (filters, sort, etc.).

---

## 2. Data Model: `NFTCollection`

The frontend expects collections in this shape (see `Frontend/types/index.ts`). Your backend entities and API responses should align with it.

```ts
interface NFTCollection {
  id: string
  name: string
  description: string
  imageUrl: string
  bannerUrl?: string
  creator: string
  creatorAddress: string
  blockchain: 'solana'
  totalSupply: number
  minted: number
  price?: number
  status: 'draft' | 'preparing' | 'ready' | 'minting' | 'completed' | 'paused'
  traits?: { name: string; value: string; rarity?: number }[]
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  endDate?: string    // ISO 8601, for "Ending Soon" tab
}
```

- **Blockchain**: Frontend is Solana-only (`blockchain: 'solana'`).
- **`endDate`**: Optional; used by Discover “Ending Soon” (sort by nearest end).
- **`price`**: `0` or missing ⇒ “Free Mint” in Discover.

---

## 3. API Endpoints to Implement

### 3.1 Featured collections (Hero, Featured Grid, Hot Collections)

**Suggested:** `GET /api/collections/featured`

- Returns a list of **featured** collections (curated or algorithmically chosen).
- Response shape: `{ success: boolean, data: NFTCollection[] }` (or similar).
- Frontend usage:
  - **Hero**: up to 5, prefer `status === 'minting'`.
  - **FeaturedDropsGrid**: up to 2, `status === 'minting'` only.
  - **HotCollections**: top 5 (e.g. by `minted` or your “hot” metric).

You can either:

- Return one list and let the frontend slice/filter, or  
- Expose separate endpoints (e.g. `featured`, `hot`) if you want different backend logic.

### 3.2 Discover section

**Option A – Single endpoint with query:**  
`GET /api/collections/discover?tab=trending|new|ending_soon|free_mint`

- **`tab=trending`**: sort by `minted` descending (or your trending score).
- **`tab=new`**: sort by `createdAt` descending.
- **`tab=ending_soon`**: only collections with `endDate`, sort by `endDate` ascending.
- **`tab=free_mint`**: `price === 0` or `price` undefined.

Return at least 6 items per tab (Discover shows max 6). Pagination optional.

**Option B – Multiple endpoints:**  
e.g. `GET /api/collections/trending`, `.../new`, `.../ending-soon`, `.../free-mint`, each returning `NFTCollection[]`.

### 3.3 All collections (Collections page)

**Suggested:** `GET /api/collections`

- Query params (align with `FilterState` in frontend):
  - `status`: `draft` | `preparing` | `ready` | `minting` | `completed` | `paused`
  - `search`: text search (e.g. name, description)
  - `sortBy`: `newest` | `oldest` | `name` | `minted`
- Returns paginated list of `NFTCollection[]` for browse/filters.

### 3.4 Single collection (detail pages)

**Suggested:** `GET /api/collections/:id`

- Returns one `NFTCollection` by `id`.
- Used for `/drops/{id}` and `/collections/{id}` detail pages (when you add them).

---

## 4. Response Format

Use a consistent wrapper so the frontend can handle loading/error states:

```ts
// Frontend already has this type (Frontend/types/index.ts)
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

- **Success:** `{ success: true, data: NFTCollection | NFTCollection[] }`
- **Error:** `{ success: false, error: string }` (and optionally `message`).

---

## 5. CORS and Base URL

- Enable CORS for the Frontend origin (e.g. `http://localhost:3000` in dev).
- Frontend will call something like `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000`) + path. Ensure your backend serves the API under that base.

---

## 6. Summary Checklist

| # | Item | Purpose |
|---|------|---------|
| 1 | **Data model** matching `NFTCollection` | Hero, Featured, Hot, Discover, Collections |
| 2 | **`GET /api/collections/featured`** (or equivalent) | Hero, FeaturedDropsGrid, HotCollections |
| 3 | **`GET /api/collections/discover?tab=...`** (or per-tab endpoints) | DiscoverSection tabs |
| 4 | **`GET /api/collections`** with filters & sort | Collections page |
| 5 | **`GET /api/collections/:id`** | Drop/collection detail pages |
| 6 | **`ApiResponse<T>`**-style JSON | Consistent frontend handling |
| 7 | **CORS** + **configurable API base URL** | Frontend can call backend from browser |

---

## 7. Frontend Changes Required (for “completed normally”)

After the backend exists:

1. **Replace mock data** in `HeroSection`, `FeaturedDropsGrid`, `HotCollections`, `DiscoverSection` with `fetch` (or a small API client) to the new endpoints.
2. **Collections page**: Replace `mockCollections` with `GET /api/collections` (and wire filters/sort to query params).
3. **Add** `/drops/[id]` and `/collections/[id]` pages that fetch `GET /api/collections/:id` and render the collection detail (or reuse a shared detail component).

Until those frontend changes are made, the app will keep using `lib/data/collections.ts` mocks; the backend spec above is what you need to implement so that switching to real APIs works “normally.”
