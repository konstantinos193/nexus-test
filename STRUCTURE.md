# Frontend Structure Overview

## Complete Component Organization

All components are properly organized and imported in page files with cheeky dark humor comments throughout.

### Layout Components (`components/layout/`)
- **Header.tsx** - Navigation with wallet connect, mobile menu, search
- **Footer.tsx** - Footer with links, social media, legal stuff
- **Layout.tsx** - Main wrapper that includes Header and Footer

### UI Components (`components/ui/`)
- **Button.tsx** - Reusable button with variants (primary, secondary, outline, ghost)
- **Card.tsx** - Card component with variants (default, elevated, outlined)
- **Input.tsx** - Text input with label and error handling
- **Textarea.tsx** - Textarea input with label and error handling
- **Select.tsx** - Dropdown select with options
- **LaunchpadScrollbar.tsx** - Custom scrollbar (e.g. collections layout)

### Feature Components (`components/features/`)
- **collections/** – CollectionCard, CollectionFilters, CollectionGrid; pyramid layout (FeaturedBanner, TopCollectionsSpread, CompactCollectionGrid, PyramidLayout)
- **create/** – CreatePageContent, CreatePageHeader, CollectionForm, StepIndicator
- **home/** – HomePageContent, HeroSection, FeaturedDropsGrid, HotCollections
- **not-found/** – NotFoundContent

### Wallet Components (`components/wallet/`)
- **WalletConnect.tsx** - Wallet connection UI (MetaMask ready)

### Pages (`app/`)
- **page.tsx** - Landing page with hero, features, CTA
- **collections/page.tsx** - Collections browsing with filters
- **create/page.tsx** - Collection creation form
- **dashboard/page.tsx** - Creator dashboard with stats
- **tools/page.tsx** - Platform tools page

### Data & utilities (`lib/`)
- **data/collections.ts** – `mockCollections` (collections page), `featuredCollections` (home hero, featured grid, hot)
- **seo/config.ts** – Site title, description, URLs, etc.
- **utils/index.ts** – `cn()` for className merging
- **utils/format.ts** – Formatting (address, number, date, percentage)
- **utils/placeholderBanners.ts** – Placeholder banner helpers

### Hooks (`hooks/`)
- **useCollectionFilters.ts** – Filtering logic for collections page
- **useCreateCollectionForm.ts** – Create-collection form state

### Types (`types/`)
- **index.ts** – NFTCollection, FilterState, User, WalletConnection, etc.

## Import Pattern

All pages follow this import pattern:
1. External libraries (React, Next.js)
2. Internal components (from `@/components/...`)
3. Utilities (from `@/lib/...`)
4. Types (from `@/types`)

Example:
```typescript
import Layout from '@/components/layout/Layout'
import CollectionGrid from '@/components/features/collections/CollectionGrid'
import { NFTCollection } from '@/types'
```

## Dark Mode Colors

All components use the dark mode color palette from `tailwind.config.ts`:
- Backgrounds: `bg-dark-bg-primary`, `bg-dark-bg-secondary`, `bg-dark-bg-tertiary`
- Text: `text-dark-text-primary`, `text-dark-text-secondary`, `text-dark-text-tertiary`
- Accents: `text-dark-accent-primary`, `bg-dark-accent-primary`
- Borders: `border-dark-border-primary`, `border-dark-border-secondary`

## Code Comments

Every component and complex function has cheeky dark humor comments explaining:
- What the component does
- Why it exists
- How it works (when complex)
- Entertaining but informative commentary

Example:
```typescript
/**
 * CollectionCard Component - The face of each collection
 * This is what users see when browsing collections
 * Because first impressions matter (unlike my dating profile)
 */
```
