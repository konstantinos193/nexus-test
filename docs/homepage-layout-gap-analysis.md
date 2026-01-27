# Homepage Layout — What We Have & How to Enrich Further Down

**Context:** Nexus launchpad (owner: MarTech Networks) — homepage.

**Current homepage = keep as-is.** Hero carousel, FeaturedDropsGrid, HotCollections — that’s exactly what we need for the top of the page.

This doc is about **enriching the homepage further down**: what to add *below* those sections.

---

## What We Have (Perfect — Don’t Touch)

```
HomePageContent
├── HeroSection          ← carousel of featured drops
├── FeaturedDropsGrid    ← grid of 2 featured drops (stats, etc.)
└── HotCollections       ← horizontal ranked list, View All
```

---

## How to Enrich Further Down

### 1. Discover section (new, below Hot Collections)

Add a **Discover** block under Hot Collections:

```
[ Trending ] [ New ] [ Ending Soon ] [ Free Mint ]

→ Grid of CollectionCard for the active tab
```

- **Tabs:** Trending | New | Ending Soon | Free Mint.
- **Content:** Reuse `CollectionCard` (from `features/collections`). Each tab shows a filtered grid.
- **Data per tab (conceptual):**
  - **Trending** — e.g. sort by mint velocity / volume.
  - **New** — recent launches (e.g. by `createdAt`).
  - **Ending Soon** — mint ending soon (needs `endDate` or similar).
  - **Free Mint** — `price === 0` (or undefined depending on your model).

**Check:** `CollectionCard` links to `/collections/:id`. If discover should link to `/drops/:id`, add an optional prop (e.g. `linkBase`) or a variant.

---

### 2. Optional: Hot Collections sorting (enhancement only)

If you want to enrich *that* section later (without changing layout):

- Add sort UI: **Mint velocity** | **% minted** | **Volume** | **Time remaining**.
- Wire it to re-order the Hot Collections list. Mock sort is fine until you have real metrics.

Not required for “enrich further down” — only if you choose to add it.

---

## Summary

| Section | Status | Next step |
|--------|--------|-----------|
| Hero | ✅ Keep | — |
| FeaturedDropsGrid | ✅ Keep | — |
| HotCollections | ✅ Keep | Optional: add sorting later |
| **Discover** | ❌ Missing | **Add below Hot Collections**: tabs + `CollectionCard` grid |

**Concrete “enrich further down” work:** Add a **Discover** section with Trending / New / Ending Soon / Free Mint tabs, each rendering a grid of `CollectionCard`. Optional: extend mock data with `endDate` (and whatever you use for “trending”) when you’re ready.
