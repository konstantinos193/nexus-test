# NFT Create Page - Complete Analysis

**URL:** `http://localhost:3000/create?step=1|2|3|4`

**Page:** `/create` - NFT Collection Creation Wizard

---

## 📋 Overview

A 4-step wizard for creating NFT collections on Solana. The page uses a custom CSS-only design (no Tailwind), with all classes prefixed with `nft-create-*`.

**Flow:**
1. **Step 1: Details** → Collection information, metadata standard, royalties, splits
2. **Step 2: Upload** → Images & metadata folders, IPFS upload
3. **Step 3: Deploy** → Mint configuration, pricing, phases
4. **Step 4: Success!** → Review and deploy

---

## 🎨 Page Structure

### Header
- **Title:** "Create NFT Collection"
- **Logo:** Top-left navigation
- Sticky header with border-bottom

### Hero Section
- **Title:** "Create your collection"
- **Subtitle:** "Set details, upload art, deploy on Solana — a few steps to go live."
- Centered, responsive typography

### Stepper (Progress Bar)
- **Horizontal stepper:** 4 steps with numbered circles
- **States:** 
  - Active (current step): white background, accent border
  - Completed (past steps): gray, clickable to go back
  - Disabled (future steps): gray, not clickable
- **Sticky:** Position sticky at top of content area
- **Connected line:** Background track shows progress percentage

---

## 📝 Step 1: Collection Details

### Purpose
Configure collection metadata, images, standards, and financial splits

### Key Sections

#### 1. Collection Information
**Fields:**
- **Collection Name** (required)
  - Input: text, max 64 chars
  - Validation: Must be 2-64 characters
  - Error shown on blur if invalid
  - Tooltip: "The name of your collection eg. 'My NFTs'"

- **Symbol** (required)
  - Input: text, max 12 chars
  - Auto-sanitized: uppercase alphanumeric only
  - Validation: 1-12 characters
  - Tooltip: "Ticker/symbol on blockchain eg. 'MNFT'"

- **Collection Description**
  - Input: text, max 250 chars
  - Optional field
  - Tooltip: "The description of your collection"

- **Launch Date**
  - Input: datetime-local
  - Sets when minting goes live
  - Defaults to current time
  - Tooltip: "Go live now or schedule for future"

- **Royalty %**
  - Input: number, 0-50%
  - Step: 0.5
  - Default: 5%
  - Displayed with "%" suffix
  - Tooltip: "Percentage of secondary sales paid to creators"

#### 2. Collection PFP & Banner
**Two upload zones side-by-side:**

**Collection PFP:**
- Square aspect ratio (1:1)
- Drag-and-drop or click to select
- Accepts: PNG, JPG
- Auto-uploads to IPFS
- Shows IPFS hash when uploaded
- Preview shows uploaded image
- Max width: 200px

**Banner (optional):**
- Wide aspect ratio (16:6)
- Drag-and-drop or click to select
- Accepts: PNG, JPG
- Auto-uploads to IPFS
- Shows IPFS hash when uploaded
- Preview shows uploaded image
- Max width: 480px

#### 3. Metadata Standard
**Radio group with 3 options:**
- **Core** - "Metaplex Core (recommended)"
- **Metaplex** - "Metaplex Token Metadata"
- **CNFT** - "Compressed NFTs (cNFTs)"

Default: Core

#### 4. Mint Mode
**Two card options (radio-style):**

**Random Mint:**
- Description: "Minters get a random NFT from the collection"
- Visual card with checkmark when selected

**Pick & Mint:**
- Description: "Minters select which NFT they want before minting"
- Visual card with checkmark when selected

Tooltip explains both modes

#### 5. Collection Options (Toggle Panel)
**Panel with switch rows:**

**Freeze Collection:**
- Toggle switch (on/off)
- Description: "While frozen, NFTs cannot be traded. Unfreezeable after sellout or predetermined date"
- When ON, shows additional field:
  - **Unfreeze at date (optional)**
  - datetime-local input
  - Description: "Trading stays frozen until this date. Leave empty to only unfreeze when sold out"
  - Min value: must be after launch date

**Reveal Later:**
- Toggle switch (on/off)
- Description: "Use placeholder art for NFT collection to be revealed later"

**Enforce Royalties:**
- Toggle switch (always ON, disabled)
- Description: "Enforce royalties"
- Read-only, cannot be changed

#### 6. Secondary Royalty Split
**Purpose:** Split secondary sale royalties between wallets

**Panel structure:**
- Header with title and total percentage badge
- Error banner if total ≠ 100%
- List of wallet rows (can add multiple)

**Each row contains:**
- Row number badge
- **Share %** field
  - Number input (0-100)
  - Prefix: "%"
  - Must total 100% across all rows
- **Solana address** field
  - Text input for wallet address
  - Placeholder: "Wallet address"
  - Should validate base58 format (32-44 chars)

**Actions:**
- "Add recipient" button to add more rows
- Maximum recipients enforced

**Validation:**
- Total must equal 100%
- Badge shows "Total: X.X%" in real-time
- Valid: green badge
- Invalid: red badge with error message

#### 7. Mint Funds Split
**Purpose:** Split primary sale proceeds between wallets

**Identical structure to Royalty Split:**
- Header with title and total percentage badge
- Error banner if total ≠ 100%
- List of wallet rows
- Same field structure as royalty split
- Same validation rules

### Footer Actions
- **Save draft** button (secondary style)
- Auto-save indicator: "✓ Draft saved X ago"

### Validation
**Next button disabled if:**
- Collection name invalid
- Symbol invalid
- Not connected to wallet
- Royalty split doesn't total 100%
- Mint funds split doesn't total 100%

### Visual Design Notes
- Clean white text on dark background (#0a0a0f)
- Accent color: white/neutral (no brand color)
- Inputs: dark with subtle borders (#252535)
- Labels: gray (#8a8a9a)
- Tooltips: info icons with hover popover
- Responsive: stacks on mobile, side-by-side on desktop
- Smooth transitions (0.2s) on all interactions

---

## 📁 Step 2: Media & Metadata

### Purpose
Upload images and metadata folders, automatically upload to IPFS

### Flow Strip (3-stage progress)
Visual indicator showing:
1. **Images** → uploaded images folder
2. **Metadata** → uploaded JSON metadata folder  
3. **Upload** → IPFS upload complete

Each stage shows:
- Numbered circle (1, 2, 3)
- Label text
- Checkmark (✓) when complete
- Active/done states with color coding
- Arrows (→) between stages

### Two Dropzone Cards (Side-by-side)

#### Images Folder Dropzone
**Left card:**
- Drag-and-drop folder upload
- Click to select folder (webkitdirectory attribute)
- Accepts: PNG, JPG image files
- Filters only image files from folder

**States:**
- **Empty:** "Images folder" + hint "PNG / JPG · 0.png, 1.png, …"
- **Files loaded:** Shows count "X images ready" + "Drop again to replace"
- **Done:** Green tint, shows preview thumbnail if collection image exists
- **Dragover:** Scale animation, accent border

**Features:**
- Preserves folder structure internally
- Only accepts image/* files
- Shows first image as preview
- Files named 0.png, 1.png, etc.

#### Metadata Folder Dropzone
**Right card:**
- Drag-and-drop folder upload
- Click to select folder
- Accepts: JSON files only
- Matches metadata files to images by stem (0.json → 0.png)

**States:**
- **Empty:** "Metadata folder" + hint "JSON · 0.json, 1.json, …"
- **Files loaded:** Shows count "X metadata files ready"
- **Done:** Green tint
- **Dragover:** Scale animation, accent border

**Metadata format expected:**
```json
{
  "name": "NFT #0",
  "image": "0.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Eyes", "value": "Laser" }
  ],
  "properties": {
    "files": [
      { "uri": "0.png", "type": "image/png" }
    ]
  }
}
```

### Upload Status
**Centered status indicator:**
- **Uploading:** "Uploading…" (gray text)
- **Done:** "✓ Ready" (green text)
- **Error:** Error message (red text)

**Auto-upload behavior:**
- Automatically starts when BOTH folders are set
- Uploads images to IPFS first
- Rewrites metadata image URLs to IPFS paths
- Uploads metadata to IPFS
- Returns base_uri for contract

### NFT Preview Gallery
**Shown when metadata is loaded:**

**Header:**
- "Preview · X items (click for details)"
- Hint text in gray

**Grid layout:**
- Responsive grid: 4-5 columns on desktop, 2-3 on tablet, 1-2 on mobile
- Auto-fill with minmax(120px, 1fr)
- Gap: 0.75-1rem
- Max height: 50vh with vertical scroll

**Each preview card:**
- Square image container (aspect-ratio: 1)
- NFT name (truncated with ellipsis)
- First 2 attributes shown as tags
- "+X" indicator if more attributes
- Hover: subtle border glow
- Click: opens detail modal

**Card structure:**
```
┌─────────────┐
│   [Image]   │
├─────────────┤
│ NFT Name    │
│ Trait: Val  │
│ Trait: Val  │
│ +3 more     │
└─────────────┘
```

### Preview Detail Modal
**Opened when card clicked:**

**Structure:**
- Full-screen overlay (dark backdrop with blur)
- Centered modal card (max-width: 420px)
- Close button (× in top-right)

**Content:**
- Large image (square, aspect-ratio: 1)
- NFT name (h2, large, white)
- All attributes listed:
  - Two columns: trait type | value
  - Border between each row
  - Scrollable if many attributes

**Interaction:**
- Click overlay to close
- Click × button to close
- Click inside modal: event stops (doesn't close)
- Portaled to document.body (not in flow)

### How It Works (Expandable)
**Details/summary element:**
- Summary: "How it works" (clickable)
- Body: Explains IPFS upload process
  - "Images are uploaded to IPFS first"
  - "Each metadata file's **image** and **properties.files[].uri** are updated to the new IPFS URLs"
  - "The **base_uri** you get points to the metadata directory for the contract"

### Footer Actions
- **Back** button
- **Next** button (disabled until upload complete)

### Validation
**Next button disabled if:**
- No images folder uploaded
- No metadata folder uploaded  
- Upload in progress
- Upload error occurred
- No base_uri received

### Technical Details

**File handling:**
- Uses `webkitdirectory` attribute for folder selection
- Drag-and-drop uses DataTransfer API
- Recursively walks folder structure
- Filters files by type (image/* for images, .json for metadata)

**IPFS upload flow:**
1. Upload all images → get IPFS hashes
2. Rewrite metadata JSON files with new IPFS image URLs
3. Upload updated metadata → get base_uri
4. Store base_uri for contract deployment

**Preview generation:**
- Pairs images with metadata by filename stem
- Creates object URLs for image preview (blob URLs)
- Parses JSON metadata for attributes
- Sorts by filename for consistent order

### Visual Design Notes
- Two-column card layout (grid)
- Stacks to single column on mobile
- Smooth drag-over animations
- Green success states (#68d391)
- Gray uploading states (#8a8a9a)
- Preview grid with hover effects
- Modal with backdrop blur

---

## ⚙️ Step 3: Mint Configuration

### Purpose
Configure mint pricing, wallet limits, phases, and royalty payouts

### Key Sections

#### 1. Mint Type
**Radio group with 4 options:**
- Public Mint
- Allowlist  
- 1/1 Mint
- Editioned

Default: "public"

Horizontal layout with radio buttons

#### 2. Mint Price
**Toggle + conditional input:**

**Free Mint Toggle:**
- Custom toggle switch (44px × 24px)
- Slider thumb (20px circle)
- Label: "Free Mint"
- ON: accent color background
- OFF: gray background

**Price Input (shown when Free Mint is OFF):**
- Text input (narrow, max-width: 140px)
- Placeholder: "0.5 SOL"
- Free-form text (validated later)
- Displays in SOL

**Validation:**
- Either Free Mint is ON, OR
- Valid price > 0 must be entered

#### 3. Max per Wallet
**Number input:**
- Narrow input (140px)
- Min: 1
- No max enforced in UI
- Optional field
- Limits how many NFTs one wallet can mint

#### 4. Max Supply per Phase
**Number input:**
- Narrow input (140px)
- Min: 1
- Optional field
- Sets maximum mints per phase window

#### 5. Mint Phases (Optional)
**Purpose:** Schedule multiple mint windows with different rules

**Empty state:**
- Gray dashed border box
- Message: "No phases yet. Add phases to schedule Whitelist, Public, or custom windows with different prices or allowlists."

**Phase item structure (dark card):**

**Header:**
- Phase number badge: "Phase 1", "Phase 2", etc.
- Phase name input: text field, placeholder "Phase name (e.g. Whitelist)"
- Actions:
  - ↑ Move earlier button (disabled if first)
  - ↓ Move later button (disabled if last)
  - "Remove" button (red)

**Body (3-column grid on desktop):**

**Column 1: Schedule**
- Label: "Schedule"
- Two datetime inputs (stacked):
  - **Start:** datetime-local, required
  - **End (optional):** datetime-local
- Error shown if end ≤ start

**Column 2: Phase Type**
- Radio group:
  - **Public:** Anyone can mint
  - **Allowlist:** Only allowlisted addresses
- Inline horizontal layout

**Column 3: Price Override**
- Text input (narrow)
- Placeholder shows default mint price or "Free"
- Optional: uses main mint price if empty
- Disabled if Free Mint is ON (collection-level)
- Hint: "Collection is free mint; phase uses free" (if applicable)

**Allowlist Addresses (shown only if Phase Type = Allowlist):**
- Label: "Allowlist addresses"
- Textarea (4 rows minimum)
- Monospace font
- Placeholder: "One wallet address per line, or comma-separated"
- Shows count: "X address(es)" below textarea
- Parsing: split by newlines or commas, trim whitespace

**Phase Validation:**
- Start date required
- If end date provided, must be > start
- Shows inline error below schedule if invalid

**Add Phase Button:**
- Dashed border button
- Text: "+ Add phase"
- Creates new empty phase
- Phases can overlap or run sequentially

**Phase ordering:**
- User can reorder with ↑↓ buttons
- Order matters for execution

#### 6. Royalties & Payouts
**Section divider:** h2 "Royalties & Payouts" with margin-top

**Royalty % (0–50%)**
- Number input (narrow, 140px)
- Min: 0, Max: 50, Step: 0.5
- Default: 5
- Displayed with "%" suffix
- Clamped to range on change

**Royalty Wallet**
- Text input (full width)
- Placeholder: "Wallet address"
- "Validate" button on the right
  - Appears next to input
  - Can check if address is valid Solana base58

**Primary Sale Split**
- Table layout:
  - Header: "Wallet Address" | "% Allocation"
  - Rows: one per split recipient
  - Each row has two inputs:
    - Wallet address (text)
    - Percentage (number)

**Split validation:**
- Total must equal 100%
- Displayed below table:
  - "Total: X.X% ✓" (valid, gray)
  - "Total: X.X% (must = 100%)" (invalid, red)

**"+ Add wallet" button:**
- Below table
- Dashed border style
- Adds new row to split table

**Platform Fees (Read-only)**
- Label: "Platform Fees (Read-only)"
- Text: "Platform fee: 2%. Estimated cost per mint shown when you deploy."
- Informational only, not editable

### Footer Actions
- **Back** button
- **Next** button
  - Disabled if:
    - Not connected
    - Free Mint is OFF and no valid price entered
    - Phase validation errors exist

### Validation
**Step 3 is valid when:**
- Free Mint is ON, OR
- Mint price is valid number > 0

**Phase validation (per phase):**
- Start date/time required
- End date must be after start (if provided)
- Allowlist addresses parsed correctly (if Allowlist type)

**Split validation:**
- Not enforced at this step
- But shown in UI for user awareness

### Visual Design Notes
- Clean form layout, vertical stacking
- Narrow inputs (140px) for numbers
- Toggle switch with smooth animation
- Phase cards with dark background
- Hover effects on phase cards
- Red remove buttons for phases
- Dashed borders for "add" actions
- Inline validation errors (red text)
- Real-time total calculation for splits

### Use Cases
**Simple public mint:**
- Free Mint ON or set price
- No phases
- Standard royalty split

**Whitelist + public phases:**
1. Phase 1: Allowlist, earlier time, discounted price
2. Phase 2: Public, later time, regular price

**1/1 with scheduled release:**
- Single phase with future start date
- Limited supply per phase

---

## ✅ Step 4: Deploy & Review

### Purpose
Final review before deploying collection to blockchain

### Summary Card
**Layout:**
- Thumbnail image (64×64px, rounded)
- Metadata display

**Content:**
- Collection name (h3)
- Blockchain & standard: "Solana · [Standard]"
  - Shows selected metadata standard label
- Bulleted list:
  - **Supply:** Total supply or "—"
  - **Mint price:** "Free" or price value or "—"
  - **Royalties:** X%
  - **Freeze:** status text
    - "until [date]" if freeze date set
    - "until sold out" if freeze on but no date
    - "off" if not frozen
  - **Phases:** Count and names
    - "Phases: 2 — Whitelist, Public"
    - Only shown if phases exist
  - **Go live:** "on deploy"

### Pre-Flight Checks
**Checklist:**
- ✓ Wallet connected
- ✓ Metadata valid
- ✓ Supply matches assets
- ✓ Royalties under limit

All items shown with checkmarks (non-interactive)

### Warning Box
**Yellow/orange warning banner:**
- "Once deployed, collection settings cannot be changed."
- Emphasizes permanence of deployment

### Action Buttons
**Four buttons (flex row, wrapped):**

1. **Save as Draft**
   - Secondary style (gray)
   - Saves current state to localStorage
   - Doesn't deploy to blockchain

2. **Deploy Collection**
   - Primary style (white)
   - Deploys collection without opening mint
   - Disabled if not connected
   - Main deployment action

3. **Deploy & Open Mint**
   - Primary style (white)
   - Deploys AND opens minting immediately
   - Disabled if not connected
   - Combined action

4. **Create new collection**
   - Back/secondary style
   - Clears draft and resets to Step 1
   - Starts fresh collection

### Draft Saved Indicator
**Shown if draft saved:**
- "✓ Draft saved" message
- Small badge with checkmark
- Below action buttons

### Footer
- No Back/Next buttons
- Only the 4 action buttons above

### Validation
**Deploy buttons disabled if:**
- Wallet not connected
- Pre-flight checks fail

### Visual Design Notes
- Large summary card with dark background
- Thumbnail on left, details on right
- Clean list formatting
- Warning box with subtle background
- Multiple CTAs with clear hierarchy
- Primary actions (Deploy) emphasized

---

## 🔄 Cross-Step Features

### Wallet Connection Banner
**Shown on ALL steps when wallet disconnected:**
- Warning banner (⚠) at top of content
- Message: "Connect your wallet to create a collection. Use the Connect Wallet button in the header."
- Role: alert (accessibility)
- Accent background with border

### Auto-Save (Draft)
**Behavior:**
- Saves to localStorage every 2 seconds if changes detected
- Key: `nexus-create-draft`
- Stores entire form state including:
  - Step number
  - All form values
  - Uploaded file metadata (IPFS hashes)
  - Phase configurations
  - Split configurations

**Indicator:**
- "✓ Draft saved X ago" 
- Shows time since last save (e.g., "1m ago", "just now")
- Positioned top-right in Step 1

**Load on mount:**
- Checks localStorage for existing draft
- Restores all values if found
- User can continue where they left off

### Navigation
**URL param:** `?step=N`
- Step 1: `?step=1`
- Step 2: `?step=2`
- Step 3: `?step=3`
- Step 4: `?step=4`

**Stepper interaction:**
- Can click completed steps to go back
- Cannot skip ahead to future steps
- Updates URL param on step change

**Footer buttons:**
- **Back:** Goes to previous step (disabled on Step 1)
- **Next:** Goes to next step (disabled if current step invalid)
  - Step 1: validates name, symbol, splits
  - Step 2: validates folders uploaded, IPFS complete
  - Step 3: validates mint price or free mint

**Validation prevents progression:**
- Each step has its own validation rules
- Next button shows disabled state + optional tooltip
- Reason shown in footer hint text

### Error Handling
**Field-level errors:**
- Shown below invalid fields
- Red text (#f87171)
- Role: alert for screen readers
- Only shown after field blur or submit attempt

**Section-level errors:**
- Royalty split error banner
- Mint funds split error banner
- Phase validation errors

**Upload errors:**
- IPFS upload failures
- Image processing errors
- Metadata parsing errors
- Shown inline below upload areas

### Toast Notifications
**Position:** Fixed bottom-right

**Types:**
- **Success toast:**
  - Green tint (#a7f3d0)
  - Border: green glow
  - Example: "Draft saved"

- **Error toast:**
  - Red tint (#fecaca)
  - Border: red glow
  - Example: "Upload failed"

**Structure:**
- Icon (optional)
- Message text
- Dismiss button (×)
- Auto-dismiss after 5 seconds
- Slide-in animation from bottom

### Loading States
**Upload indicators:**
- "Uploading…" text
- Disabled dropzones
- Spinner or progress animation
- Gray-out effect

**Button loading:**
- Disabled state
- Opacity: 0.5
- Cursor: not-allowed

### Responsive Behavior

**Mobile (<640px):**
- Single column layout
- Full-width inputs
- Stacked stepper (vertical)
- Stacked upload cards
- Preview grid: 1-2 columns
- Phase fields stack vertically

**Tablet (640-1024px):**
- Two-column grids where applicable
- Side-by-side upload cards
- Preview grid: 3-4 columns
- Phase fields: some stacking

**Desktop (>1024px):**
- Full multi-column layouts
- Wider container (max-width: 1100px)
- Preview grid: 4-5 columns
- All phase fields in row

**Touch interactions:**
- Larger tap targets (44×44px minimum)
- No hover-only features on mobile
- Swipe-friendly modals

---

## 🎯 UX Issues & Improvement Opportunities

### Current Pain Points

#### 1. Step 1: Information Overload
**Problem:** Too much content in one view
- 7 major sections on one page
- Requires extensive scrolling
- Split configuration is complex
- No clear visual hierarchy between sections

**Suggestions:**
- Break into sub-steps or tabs
- Use progressive disclosure (collapsible sections)
- Add visual dividers between major sections
- Sticky section headers while scrolling

#### 2. Step 2: Unclear Upload Flow
**Problem:** Users may not understand the 3-stage process
- Flow strip is subtle
- No tooltips explaining each stage
- Unclear what happens automatically

**Suggestions:**
- Add instructional overlay on first visit
- Animate flow strip stages as they complete
- Show progress percentage during upload
- Add "What happens next?" hints

#### 3. Step 3: Phases UX is Complex
**Problem:** Phase configuration is powerful but confusing
- Empty state doesn't show example
- Unclear what "phases" means to new users
- Validation errors appear suddenly
- Hard to visualize timeline

**Suggestions:**
- Add "Add example phases" button that populates Whitelist + Public
- Visual timeline showing phase overlap
- Inline validation with friendly messages
- Tooltips on every phase field
- "Preview mint schedule" button

#### 4. Split Tables (Step 1 & 3)
**Problem:** Real-time percentage calculation is not obvious
- Total badge is small
- Easy to miss that it needs to be 100%
- No visual guide for remaining percentage
- Can't auto-fill remainder

**Suggestions:**
- Larger, more prominent total indicator
- Progress bar showing 0-100%
- "Auto-balance" button to distribute evenly
- Show remaining % as you type
- Lock one row and calculate others

#### 5. Stepper Navigation
**Problem:** Can't see where you are in multi-field steps
- Scrolling loses context
- No indication of sub-progress within a step
- Back button behavior unclear (loses edits?)

**Suggestions:**
- Sticky breadcrumb within steps
- Section mini-nav (jump to "Splits", "Images", etc.)
- Unsaved changes warning on Back
- "Save & Continue Later" prominent button

#### 6. Validation Feedback
**Problem:** Unclear why Next is disabled
- Tooltip on disabled button is weak pattern
- Users click anyway, confused when nothing happens
- No summary of what's missing

**Suggestions:**
- Inline "Missing requirements" banner above footer
- Checklist of required fields at top of step
- Scroll to first error on Next click
- Highlight invalid sections with pulse animation

#### 7. Phase Date/Time Pickers
**Problem:** datetime-local inputs are clunky
- Different appearance across browsers
- Hard to type times accurately
- No smart defaults (e.g., "tomorrow at 3pm")

**Suggestions:**
- Custom date/time picker with better UX
- Smart suggestions: "In 1 day", "In 1 week"
- Copy launch date button
- Duration-based input (phase lasts 2 hours)

#### 8. Mobile Experience
**Problem:** Heavy on mobile
- Lots of scrolling
- Small touch targets for phase controls
- Tables don't resize well
- Hard to see full context

**Suggestions:**
- Swipeable wizard on mobile
- Bigger touch targets (48×48px min)
- Accordion sections (expand to edit)
- Bottom sheet for phase editing
- Sticky "Save & Continue" footer on mobile

### Specific Smoothness Issues

#### Animation & Transitions
**Issues:**
- Step transitions feel abrupt
- Form elements pop in instantly
- Upload progress lacks feedback
- Phase reordering has no animation

**Fixes:**
- Add slide/fade transition between steps
- Stagger form field entrance animations
- Smooth progress bar during upload
- Animate phase card reordering (drag effect)
- Loading skeletons for async content

#### Scroll Behavior
**Issues:**
- No scroll restoration on Back
- Long pages with no anchor links
- Footer can be missed on long steps
- Phase sections require hunting

**Fixes:**
- Scroll to top on step change
- Sticky footer on long pages
- "Jump to section" quick links
- Auto-scroll to new phase when added
- Smooth scroll behavior on all navigations

#### Micro-interactions
**Issues:**
- Toggle switches lack satisfying click feel
- Input focus states are subtle
- Hover effects are minimal
- Success states flash too quickly

**Fixes:**
- Add haptic feedback (mobile)
- Stronger focus rings with smooth transitions
- Hover lift effect on cards
- Success checkmark animation (scale + fade)
- Disabled state explanations on hover

#### Performance
**Issues:**
- Large image previews can lag
- Metadata parsing blocks UI
- IPFS upload progress unclear
- Phase rendering with many items

**Fixes:**
- Lazy load preview images
- Use web workers for JSON parsing
- Chunked upload with progress per file
- Virtualize phase list if >10 items
- Debounce split total calculations

### Accessibility Improvements

**Current issues:**
- Some aria-labels missing
- Color contrast on gray text
- No keyboard shortcuts
- Error announcements weak

**Needed:**
- Full keyboard navigation testing
- Screen reader announcements for all state changes
- Higher contrast mode option
- Skip links for long forms
- Focus management on modal open/close

---

## 🛠️ Technical Architecture

### Component Structure
```
CreatePageContent (main wizard)
├── Header
├── Hero
├── Stepper (progress bar)
├── ContentCard
│   ├── Step1Content
│   │   ├── BasicFields
│   │   ├── ImageUploads (PFP + Banner)
│   │   ├── MetadataStandard (radio)
│   │   ├── MintMode (cards)
│   │   ├── CollectionOptions (toggles)
│   │   ├── RoyaltySplitPanel
│   │   └── MintFundsSplitPanel
│   ├── Step2Content
│   │   ├── FlowStrip
│   │   ├── DropzoneCards
│   │   ├── UploadStatus
│   │   ├── PreviewGallery
│   │   └── HowItWorks (details)
│   ├── Step3Content
│   │   ├── MintType (radio)
│   │   ├── MintPrice (toggle + input)
│   │   ├── WalletLimits
│   │   ├── PhasesList
│   │   │   └── PhaseItem[] (repeating)
│   │   └── RoyaltiesPayouts
│   └── Step4Content
│       ├── SummaryCard
│       ├── PreFlightChecks
│       ├── Warning
│       └── ActionButtons
├── Footer (Back/Next)
└── PreviewModal (portal)
```

### State Management
**React useState hooks for:**
- `step` (1-4)
- Form values for each field
- Upload states (loading, error, success)
- Phase array
- Split arrays (royalty, mint funds)
- UI states (dragOver, modalOpen, etc.)

**localStorage for:**
- Draft persistence
- Auto-save every 2 seconds

**URL sync:**
- `?step=N` param updated on navigation
- Validates on page load

### Data Flow

**Step 1 → Step 2:**
- Collection metadata collected
- Images uploaded to IPFS
- Metadata standard selected

**Step 2 → Step 3:**
- Media uploaded to IPFS
- base_uri received
- Preview generated

**Step 3 → Step 4:**
- Mint configuration finalized
- Phases structured
- Royalty splits validated

**Step 4 → Blockchain:**
- All data packaged
- Smart contract deployment
- Transaction signed

### Validation Layer
**Per-step validation functions:**
- `validateStep1()` → name, symbol, splits
- `validateStep2()` → folders, baseUri
- `validateStep3()` → price or freeMint
- `validateStep4()` → pre-flight checks

**Real-time validation:**
- Split percentages (on change)
- Phase times (on blur)
- Field requirements (on blur)

### API Integration
**IPFS upload:**
- POST to `/api/ipfs/upload`
- Returns IPFS hash + gateway URL
- Handles images and metadata separately

**Future:**
- Smart contract deployment API
- Metadata indexing
- Collection registry

---

## 📊 Data Schema

### Draft Storage Schema
```typescript
interface CreateDraftPayload {
  version?: number
  step?: number
  
  // Step 1
  collectionName?: string
  symbol?: string
  collectionDescription?: string
  launchDate?: string // ISO datetime
  metadataStandard?: 'Core' | 'Metaplex' | 'CNFT'
  mintMode?: 'random' | 'pick'
  freezeCollection?: boolean
  freezeUntilDate?: string
  revealLater?: boolean
  enforceRoyalties?: boolean
  royaltyPercent?: number
  royaltyConfig?: ShareAddressRow[] // {share: string, address: string}[]
  fundReceivers?: ShareAddressRow[]
  collectionImage?: string | null // data URL or IPFS URL
  collectionImageHash?: string | null
  bannerImage?: string | null
  bannerImageHash?: string | null
  
  // Step 2
  baseUri?: string | null
  totalSupply?: string
  
  // Step 3
  mintType?: 'public' | 'allowlist' | '1of1' | 'editioned'
  mintPrice?: string
  freeMint?: boolean
  maxPerWallet?: string
  maxSupplyPerPhase?: string
  phases?: PhaseRow[] // see below
  
  timestamp?: number // last save
}

interface PhaseRow {
  name: string
  startDateTime: string // ISO datetime
  endDateTime: string
  phaseType: 'public' | 'allowlist'
  priceOverride: string
  allowlistRaw: string // newline or comma-separated addresses
}

interface ShareAddressRow {
  share: string // percentage as string
  address: string // Solana address
}
```

### Metadata JSON Schema
```json
{
  "name": "NFT #0",
  "symbol": "MNFT",
  "description": "NFT description",
  "image": "https://ipfs.io/ipfs/[hash]/0.png",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://ipfs.io/ipfs/[hash]/0.png",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

---

## 🎨 Design System Reference

### Colors
```css
--bg-primary: #0a0a0f (page background)
--bg-card: rgba(17, 17, 24, 0.9) (cards)
--bg-input: rgba(8, 8, 12, 0.8) (inputs)
--border-subtle: #252535
--border-accent: rgba(255, 255, 255, 0.2)

--text-primary: #ffffff
--text-secondary: #b8b8c8
--text-tertiary: #8a8a9a
--text-muted: #5a5a6a

--accent: #ffffff
--accent-bg: rgba(255, 255, 255, 0.06)
--accent-border: rgba(255, 255, 255, 0.2)

--success: #68d391 (green)
--error: #f87171 (red)
--warning: #fbbf24 (yellow)
```

### Typography
```css
Font: Elza (headings), System sans-serif (body)

Headings:
- h1: 2.75rem (44px), weight 700
- h2: 1.5rem (24px), weight 700
- h3: 1.125rem (18px), weight 600

Body:
- Base: 0.9375rem (15px)
- Small: 0.8125rem (13px)
- Tiny: 0.75rem (12px)

Letter spacing:
- Headings: -0.03em to -0.04em
- Labels: 0.01em
- Uppercase: 0.08em to 0.12em
```

### Spacing
```css
Gap scale:
- Tiny: 0.25rem (4px)
- Small: 0.5rem (8px)
- Medium: 0.75rem (12px)
- Base: 1rem (16px)
- Large: 1.5rem (24px)
- XL: 2rem (32px)

Padding:
- Inputs: 0.625rem 1rem (10px 16px)
- Cards: 1.25-2rem (20-32px)
- Buttons: 0.65rem 1.35rem (10px 22px)

Border radius:
- Small: 6-8px
- Medium: 10-12px
- Large: 14-16px
- Circle: 50%
```

### Animations
```css
Transitions:
- Fast: 0.15s
- Default: 0.2s
- Slow: 0.35s

Easing:
- ease-out (most UI)
- ease (general)
- cubic-bezier (custom)

Reduced motion:
- Respects prefers-reduced-motion
- Removes animations if set
```

---

## 🐛 Known Issues

### Bugs
1. **Phase reordering:** No visual feedback during move
2. **Split validation:** Doesn't block progression (should?)
3. **Image preview:** Can show stale previews if rapidly changing
4. **Metadata parsing:** No error boundary if JSON is malformed
5. **DateTime inputs:** Browser-dependent appearance, inconsistent UX

### Missing Features
1. **Bulk address import:** No CSV upload for allowlists
2. **Template collections:** No pre-made templates
3. **Preview live mint:** Can't see mint page before deploy
4. **Duplicate detection:** No check for duplicate metadata
5. **Image optimization:** No automatic resize/compression
6. **Batch operations:** Can't edit multiple phases at once

### Browser Compatibility
- **datetime-local input:** Poor support in Safari <14.1
- **webkitdirectory:** Not standard, but widely supported
- **File API:** Requires modern browser (IE11 not supported)
- **CSS Grid:** Works everywhere modern
- **backdrop-filter:** Limited support (Safari, Chrome)

---

## 📈 Metrics & Analytics

### Recommended Tracking
**Step completion:**
- % who start Step 1
- % who reach Step 2
- % who reach Step 3
- % who reach Step 4
- % who deploy

**Drop-off points:**
- Where users abandon
- How long spent per step
- Which fields cause confusion (repeat edits)

**Errors:**
- Most common validation errors
- Upload failure rate
- IPFS timeout rate

**Performance:**
- Time to upload (by file size)
- Page load time
- Step transition time

---

## 🔐 Security Considerations

### Client-Side
- No private keys stored
- Wallet connection via Solana adapter
- LocalStorage draft data not encrypted (low sensitivity)
- IPFS uploads are public by nature

### Smart Contract
- Royalty percentages clamped (0-50%)
- Address validation before deployment
- Split percentages must total 100%
- No re-deployment after initial deploy

### IPFS
- No authentication on upload (public endpoint)
- Consider rate limiting
- Malicious file upload prevention
- Content moderation for images

---

## ✅ Summary

The create page is a **comprehensive 4-step wizard** for launching NFT collections on Solana. It balances power and simplicity, offering advanced features (phases, splits, standards) while maintaining a relatively clean interface.

**Strengths:**
- Complete feature set
- Clear visual hierarchy
- Responsive design
- Auto-save functionality
- Inline validation

**Weaknesses:**
- Information density in Step 1
- Phase configuration complexity
- Limited guidance for beginners
- Performance concerns with large collections
- Mobile UX needs refinement

**Priority improvements for smoothness:**
1. Progressive disclosure in Step 1
2. Visual timeline for phases
3. Better upload progress feedback
4. Smoother animations between steps
5. Inline help/tooltips everywhere
6. Mobile-optimized phase editing
7. Better error messaging
8. Preview mode before deploy

---

## 🎯 Recommendations for ChatGPT Analysis

When asking ChatGPT to improve this page, focus on:

1. **UX flow optimization:** How to reduce cognitive load without removing features
2. **Onboarding:** First-time user experience improvements
3. **Mobile-first design:** Touch-friendly, minimal scrolling
4. **Accessibility:** WCAG 2.1 AA compliance
5. **Performance:** Lazy loading, code splitting, optimization
6. **Animation:** Micro-interactions that feel smooth and intentional
7. **Error prevention:** Better validation and user guidance
8. **Visual hierarchy:** Make important actions stand out
9. **Progressive disclosure:** Show advanced features only when needed
10. **User confidence:** Help users feel they're doing it right

**Key question for ChatGPT:**
> "How can we make this multi-step form feel effortless and confidence-inspiring, especially for users creating their first NFT collection?"
