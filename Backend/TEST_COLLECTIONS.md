# Test Collections Documentation

This document describes all test collections created for frontend testing. These collections cover various edge cases to ensure the UI handles all scenarios correctly.

## Overview

**Total Collections:** 25  
**Purpose:** Comprehensive frontend testing with edge cases  
**Last Updated:** January 27, 2026

---

## Collection Categories

### 1. Status Edge Cases (6 collections)

These test different collection statuses and how they should be displayed.

#### `draft-collection-not-ready`
- **Status:** `draft`
- **Expected Behavior:** Should NOT appear in public listings (homepage, collections page)
- **Mint Widget:** Should not be mintable
- **Display:** Hidden from public view

#### `preparing-launch-upcoming`
- **Status:** `preparing`
- **Expected Behavior:** Should show as "Upcoming" with badge
- **Mint Widget:** Should show "Upcoming Mint" with countdown
- **Display:** Featured, visible on homepage

#### `ready-to-launch-starts-tomorrow`
- **Status:** `ready`
- **Expected Behavior:** Should show as "Upcoming" with countdown to tomorrow
- **Mint Widget:** Should show "Upcoming Mint" with exact start time
- **Display:** Featured, should show countdown

#### `live-mint-active-now`
- **Status:** `minting`
- **Expected Behavior:** Should show as "Live" with green badge and pulsing dot
- **Mint Widget:** Should show "Public Mint" with "Live Now" indicator
- **Display:** Featured, active minting state
- **Progress:** 34.2% minted (3420/10000)

#### `paused-mint-temporarily-stopped`
- **Status:** `paused`
- **Expected Behavior:** Should show "Minting Paused" badge
- **Mint Widget:** Should disable mint button, show paused state
- **Display:** Not featured, paused indicator visible

#### `sold-out-completed`
- **Status:** `completed`
- **Expected Behavior:** Should show as "Sold Out" or "Ended"
- **Mint Widget:** Should show "Mint Ended" with disabled button
- **Display:** Featured, 100% minted (5000/5000)

---

### 2. Price Edge Cases (4 collections)

These test different price scenarios and formatting.

#### `free-mint-zero-price`
- **Price:** `0` (Free)
- **Expected Behavior:** 
  - Price should display as "Free" (not "0 SOL")
  - No SOL icon should appear next to price
  - Should appear in "Free Mint" tab if implemented
- **Progress:** 56.78% minted

#### `very-low-price-001-sol`
- **Price:** `0.01` SOL
- **Expected Behavior:** 
  - Should display as "0.01 SOL" with 2 decimal places
  - SOL icon should appear
  - Should handle very small amounts correctly

#### `high-price-10-sol`
- **Price:** `10` SOL
- **Expected Behavior:** 
  - Should display as "10 SOL" (or "10.0 SOL")
  - SOL icon should appear
  - Should handle large prices correctly
- **Note:** Featured collection

#### `null-price-no-price-set`
- **Price:** `null`
- **Expected Behavior:** 
  - Should handle null gracefully
  - Should show as "Free" or "TBD" or "Price TBA"
  - Should not crash or show "null SOL"
- **Status:** `preparing` (not ready yet)

---

### 3. Supply Edge Cases (4 collections)

These test different supply sizes and progress calculations.

#### `small-collection-100-nfts`
- **Supply:** 100 NFTs
- **Minted:** 45 (45%)
- **Expected Behavior:** 
  - Should handle small numbers correctly
  - Progress bar should show 45%
  - Should format numbers properly (not "100.00")

#### `large-collection-100k-nfts`
- **Supply:** 100,000 NFTs
- **Minted:** 45,678 (45.68%)
- **Expected Behavior:** 
  - Should format large numbers with commas: "100,000" and "45,678"
  - Progress calculation should be accurate
  - Should handle large numbers in UI without breaking

#### `almost-sold-out-99-minted`
- **Supply:** 10,000 NFTs
- **Minted:** 9,900 (99%)
- **Expected Behavior:** 
  - Should show high progress (99%)
  - Should create urgency feeling
  - Should show "100 remaining" clearly
- **Note:** Featured collection

#### `just-started-0-minted`
- **Supply:** 5,000 NFTs
- **Minted:** 0 (0%)
- **Expected Behavior:** 
  - Should show 0% progress
  - Should show "0 minted" clearly
  - Progress bar should be empty/minimal
- **Status:** `minting` (just started)

---

### 4. Date Edge Cases (4 collections)

These test different date scenarios and countdowns.

#### `ending-soon-tomorrow`
- **End Date:** Tomorrow (24 hours from now)
- **Expected Behavior:** 
  - Should show "Ending Soon" or countdown
  - Should create urgency
  - Should display end date clearly
- **Note:** Featured collection

#### `ending-today-in-hours`
- **End Date:** 6 hours from now
- **Expected Behavior:** 
  - Should show hour countdown (not just days)
  - Should show high urgency
  - Should format time remaining correctly
- **Note:** Featured collection

#### `long-duration-30-days`
- **End Date:** 30 days from now
- **Expected Behavior:** 
  - Should show long duration properly
  - Should not show urgency
  - Should display end date clearly

#### `no-end-date-open-forever`
- **End Date:** `null`
- **Expected Behavior:** 
  - Should handle null endDate gracefully
  - Should not show "Ends: null" or crash
  - Should show as "No end date" or "Open" or omit end date display

---

### 5. Content Edge Cases (5 collections)

These test UI handling of different content lengths and formats.

#### `very-long-name-collection-that-should-wrap-properly`
- **Name:** Very long name (60+ characters)
- **Expected Behavior:** 
  - Should wrap text properly
  - Should not break layout
  - Should truncate with ellipsis if needed
  - Should be readable

#### `short-name`
- **Name:** "Short Name"
- **Description:** Very short description
- **Expected Behavior:** 
  - Should handle short content gracefully
  - Should not have excessive spacing
  - Should look balanced

#### `special-characters`
- **Name:** Contains special characters
- **Expected Behavior:** 
  - Should handle special characters in slugs
  - Should encode URLs properly
  - Should display correctly in UI

#### `no-banner-image`
- **Banner URL:** `null`
- **Expected Behavior:** 
  - Should use `imageUrl` as fallback
  - Should use placeholder if imageUrl fails
  - Should not show broken image

#### `very-long-description`
- **Description:** Extremely long (500+ characters)
- **Expected Behavior:** 
  - Should wrap properly
  - Should be readable
  - Should not break layout
  - May need truncation with "Read more" option

---

### 6. Traits Edge Cases (2 collections)

These test trait display functionality.

#### `collection-with-traits`
- **Traits:** Has 3 traits (Background, Eyes, Hat)
- **Expected Behavior:** 
  - Should display traits section
  - Should show trait names
  - Should handle rarity if displayed
  - Traits should be clickable/expandable if implemented

#### `collection-without-traits`
- **Traits:** `null`
- **Expected Behavior:** 
  - Should NOT show traits section
  - Should not show empty traits container
  - Should handle null gracefully

---

## Testing Checklist

### Status Testing
- [ ] Draft collections don't appear in public listings
- [ ] Preparing/Ready show as "Upcoming"
- [ ] Minting shows as "Live" with active indicator
- [ ] Paused shows paused badge
- [ ] Completed shows as "Sold Out"

### Price Testing
- [ ] Free mints show "Free" (no SOL icon)
- [ ] Low prices show 2 decimals (0.01 SOL)
- [ ] High prices format correctly (10 SOL)
- [ ] Null price handles gracefully

### Supply Testing
- [ ] Small numbers format correctly (100)
- [ ] Large numbers have commas (100,000)
- [ ] Progress bars calculate correctly
- [ ] 0% and 100% display properly

### Date Testing
- [ ] End dates format correctly
- [ ] Countdowns work for hours/days
- [ ] Null endDate doesn't crash
- [ ] Urgency indicators show for ending soon

### Content Testing
- [ ] Long names wrap/truncate properly
- [ ] Long descriptions are readable
- [ ] Missing images use fallbacks
- [ ] Special characters encode correctly

### Traits Testing
- [ ] Collections with traits show trait section
- [ ] Collections without traits don't show empty section
- [ ] Trait data displays correctly

---

## Frontend Display Rules

### Status Badges
- `draft` → Hidden from public
- `preparing` → "Upcoming" badge (orange)
- `ready` → "Upcoming" badge (orange)
- `minting` → "Live Mint" badge (green, pulsing)
- `paused` → "Minting Paused" badge (orange)
- `completed` → "Sold Out" badge (gray)

### Price Display
- `0` or `null` → "Free" (no icon)
- `> 0` → Show price with SOL icon
- `< 1` → 2 decimal places (0.01, 0.69)
- `>= 1` → 1 decimal place (1.0, 10.0)

### Progress Display
- Format numbers with commas: `1,234` not `1234`
- Show percentage: `34.2%`
- Show fraction: `3,420 / 10,000`
- Show remaining: `6,580 remaining`

### Date Display
- Show full date/time for exact times
- Show countdown for ending soon
- Handle null dates gracefully
- Format: "Jan 28, 2026, 3:45 PM"

---

## API Endpoints to Test

1. **Homepage Featured:** `/api/collections?featured=true`
   - Should return: `live-mint-active-now`, `preparing-launch-upcoming`, `ready-to-launch-starts-tomorrow`, `sold-out-completed`, `free-mint-zero-price`, `high-price-10-sol`, `ending-soon-tomorrow`, `ending-today-in-hours`

2. **Collections Page:** `/api/collections`
   - Should NOT include: `draft-collection-not-ready`
   - Should include all others

3. **Individual Collection:** `/api/collections/[slug]`
   - Test each slug individually
   - Verify all fields are returned correctly

4. **Status Filtering:** `/api/collections?status=minting`
   - Should return only minting collections

5. **Search:** `/api/collections?search=live`
   - Should find collections with "live" in name/description

---

## Notes

- **Images:** All collections use placehold.co for images:
  - **Profile Picture (PFP):** 400x400 square images via `imageUrl`
  - **Banner Images:** 1200x400 wide banner images via `bannerUrl`
  - Each collection gets a unique color palette (cyan, purple, orange, green, red, yellow, blue, pink)
  - Images include collection name as text
  - Exception: "No Banner Image" collection has `bannerUrl: null` to test fallback behavior
- All creator addresses are randomly generated Solana addresses
- Featured collections appear on homepage
- All collections are on Solana blockchain
- Traits are stored as JSON in database

---

## Running the Seed

### Local Development (without Docker)

```bash
cd Backend

# Delete all existing collections
npm run seed:delete

# Seed edge cases
npm run seed:edge-cases

# Or do both at once
npm run seed:reset
```

### Docker Development

```bash
cd Backend

# Make sure Docker containers are running
docker-compose -f docker-compose.dev.yml up -d

# Delete all existing collections
npm run docker:seed:delete

# Seed edge cases
npm run docker:seed:edge-cases

# Or do both at once (recommended)
npm run docker:seed:reset
```

**Direct Docker commands:**
```bash
# Delete collections
docker-compose -f docker-compose.dev.yml exec backend npx ts-node prisma/delete-collections.ts

# Create edge cases
docker-compose -f docker-compose.dev.yml exec backend npx ts-node prisma/seed-edge-cases.ts

# Full reset
docker-compose -f docker-compose.dev.yml exec backend sh -c "npx ts-node prisma/delete-collections.ts && npx ts-node prisma/seed-edge-cases.ts"
```

**See `DOCKER_SEED_INSTRUCTIONS.md` for detailed Docker instructions.**

---

**Last Updated:** January 27, 2026  
**Maintained By:** Development Team
