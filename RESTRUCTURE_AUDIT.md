# Codebase Audit & Restructure

## What’s already good

- **`@/` path alias** — clean, consistent imports.
- **`app/`** — Next.js routes (collections, create, dashboard, tools) are clear.
- **Component split** — `layout/`, `ui/`, `features/`, `wallet/`, `seo/`, `providers/` is sensible.
- **Types** — Single `types/index.ts` for shared types.
- **Hooks** — `useCollectionFilters`, `useCreateCollectionForm` in a dedicated `hooks/` folder.
- **Lib** — `lib/` for config, data, utils; `lib/seo/config` is used consistently.
- **Import order** — External → `@/components` → `@/lib` → `@/types` is consistent.
- **Docs** — JSDoc on components is helpful (even when cheeky).

---

## Issues found

### 1. Duplicate / scattered mock data

- **`data/mockCollections.ts`** → `mockCollections` (used by collections page).
- **`lib/data/mockCollections.ts`** → `featuredCollections` (used by home hero, featured grid, hot collections).

Two different roots (`data/` vs `lib/data/`), two similar filenames, different exports. Unclear where “mock data” lives.

### 2. Dead code in `features/collections`

- **`TopCollections.tsx`** — Unused. `PyramidLayout` uses `TopCollectionsSpread` instead.
- **`CompactGrid.tsx`** — Unused. `CompactCollectionGrid` is used; they’re almost the same (grid + slice vs map).

### 3. `lib/utils` vs `lib/utils/`

- **`lib/utils.ts`** — Only `cn`.
- **`lib/utils/`** — `format`, `placeholderBanners`.

So we have both a `utils` file and a `utils/` folder. `STRUCTURE.md` also says `utils` lives under `lib/utils/`, which doesn’t match.

### 4. `FilterState` in a component

- `FilterState` is defined in `CollectionFilters.tsx`.
- `useCollectionFilters` imports it from that component.

Shared state types are better in `types/` so hooks don’t depend on UI.

### 5. `STRUCTURE.md` is outdated

- Doesn’t mention home features (Hero, FeaturedDrops, HotCollections), create flow, not-found, pyramid layout, etc.
- Wrong `utils` location.
- Doesn’t reflect `data/` vs `lib/data/`.

---

## Restructure applied

1. **Remove dead code** — Delete `TopCollections.tsx`, `CompactGrid.tsx`.
2. **Single mock data source** — Move `data/mockCollections` into `lib/data/`, export both `mockCollections` and `featuredCollections` from `lib/data/collections.ts`. Remove `data/` and `lib/data/mockCollections.ts`.
3. **Unify `lib/utils`** — Add `lib/utils/index.ts` that exports `cn`, and keep `lib/utils/format` and `lib/utils/placeholderBanners`. Delete `lib/utils.ts`. Imports `@/lib/utils` stay as-is.
4. **Move `FilterState`** — Add `FilterState` to `types/index.ts`, re-export from `CollectionFilters`, update `useCollectionFilters` to use `@/types`.
5. **Update `STRUCTURE.md`** — Match current layout and conventions.

---

## Target layout (after restructure)

```
Frontend/
├── app/                    # Routes (unchanged)
├── components/
│   ├── features/
│   │   ├── collections/    # PyramidLayout, CollectionCard, etc. (no dead code)
│   │   ├── create/
│   │   ├── home/
│   │   └── not-found/
│   ├── layout/
│   ├── providers/
│   ├── seo/
│   ├── ui/
│   └── wallet/
├── hooks/
├── lib/
│   ├── data/
│   │   └── collections.ts  # mockCollections + featuredCollections
│   ├── seo/
│   └── utils/
│       ├── index.ts        # cn
│       ├── format.ts
│       └── placeholderBanners.ts
├── types/
│   └── index.ts            # + FilterState
└── public/
```

No more `data/` at root; all app logic and mock data under `lib/` and `types/`.
