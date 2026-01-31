<div align="center">

![NeXus Logo](./public/nexuslogo_nobg.png)

# NeXus Web3 Launchpad Frontend

*A modern, dark-themed NFT launchpad that doesn't take itself too seriously (but still works like a charm)*

**Live:** [nexus-web3.com](https://nexus-web3.com)

*Private repository. Not open source.*

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.18-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Solana](https://img.shields.io/badge/Solana-1.98.4-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)

</div>

---

## What Is This, Anyway?

This is the frontend for **Nexus**, a Web3 launchpad by **MarTech Networks** that lets creators create and deploy NFT collections without the usual headaches. Built with a focus on clarity and developer experience.

Built with Next.js 16, React 19, and enough TypeScript to make your IDE happy. We're **full Solana** – custom wallet integration (we built our own; no Solana wallet-adapter CLI), smooth animations courtesy of Framer Motion, and a dark theme that won't burn your retinas at 3 AM.

The codebase is organized, documented, and occasionally sarcastic. Because if you're going to spend hours debugging, you might as well laugh about it.

---

## Features That Actually Matter

**Modern Stack, Zero Nonsense**
- Next.js 16 with App Router (because file-based routing is the future)
- React 19 with server components (because we like our components fast)
- TypeScript everywhere (because runtime errors are for the weak)
- Tailwind CSS 4 (because writing CSS manually is so 2010)

**Solana Integration That Works**
- Custom wallet integration – we built our own (no Solana wallet-adapter CLI). Phantom, Solflare, Ledger, Glow, Magic Eden, and others via our in-house layer.
- Full Solana stack – no Wagmi, no Viem, no Ethereum (because we're not doing multi-chain yet)

**Developer Experience That Doesn't Suck**
- Absolute imports with `@/` prefix (no more `../../../` hell)
- Component organization by feature (because finding things should be easy)
- Dark mode by default (because light mode is for spreadsheets)
- Responsive design (because mobile users exist, apparently)

**User Experience That's Actually Good**
- Smooth animations with Framer Motion
- Custom scrollbars that don't look terrible
- Collection browsing (filters UI in place; real data in a later milestone)
- Creator dashboard shell (stats and empty state; real data in a later milestone)

---

## Project Structure

Because organization matters (and chaos is not a feature):

```
NeXus-Front-End/
├── app/                          # Next.js app router - where pages live
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page (first impressions matter)
│   ├── globals.css               # Global styles
│   ├── not-found.tsx             # 404 page
│   ├── collections/              # Browse collections (the good stuff)
│   ├── create/                   # Create collections (make your mark)
│   ├── dashboard/                # Creator dashboard (stats and glory)
│   ├── tools/                    # Platform tools (because creators need tools)
│   ├── docs/                     # Docs placeholder
│   ├── faq/                      # FAQ placeholder
│   ├── privacy/                  # Privacy policy placeholder
│   └── terms/                    # Terms placeholder
│
├── components/                   # Where components go to live their best lives
│   ├── layout/                   # Header, Footer, Layout (the skeleton)
│   ├── features/                 # Feature-specific components (the meat)
│   │   ├── collections/          # Collection browsing components
│   │   └── home/                 # Homepage components
│   ├── seo/                      # JSON-LD and SEO components
│   ├── ui/                       # Reusable UI components (the building blocks)
│   ├── wallet/                   # Wallet connection UI (connect your wallet, please)
│   └── providers/                # Context providers (state management, but better)
│
├── lib/                          # Utilities and helpers (the unsung heroes)
│   ├── api/                      # API client
│   ├── data/                     # Mock data and collections
│   ├── seo/                      # SEO configuration (Google needs to find us)
│   ├── solana/                   # Solana RPC, config, connection, explorer
│   ├── utils/                    # Shared utilities (avatars, placeholders, etc.)
│   └── wallet/                   # Wallet adapters and helpers
│
├── hooks/                        # Custom React hooks (because DRY is a thing)
├── types/                        # TypeScript definitions (type safety is not optional)
└── public/                       # Static assets (images, icons, the usual suspects)
```

---

## Getting Started

Because reading documentation is easier than debugging broken code:

### Prerequisites

You'll need Node.js (we recommend 18+ because older versions are... well, old) and npm or yarn. If you don't have these, go install them. We'll wait.

### Installation

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/MarTechNetworks/NeXus-Front-End.git
cd NeXus-Front-End

# Install dependencies (this might take a minute, grab coffee)
npm install

# Or if you prefer yarn (we don't judge)
yarn install
```

### Environment Setup

Create a `.env.local` file in the `NeXus-Front-End` directory (project root). The app uses custom Solana wallet integration (in-house adapters); no Phantom App ID is required for wallet connect.

**Optional – for Solana and SEO:**

```env
# Solana (defaults to devnet if omitted)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Program IDs (leave empty for Milestone 1 if not deploying programs)
NEXT_PUBLIC_MINTING_PROGRAM_ID=
NEXT_PUBLIC_PAYMENT_PROGRAM_ID=
NEXT_PUBLIC_WHITELIST_PROGRAM_ID=

# SEO (optional; defaults to https://nexus-web3.com)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

If you don't set these, the app still runs: it uses devnet and the built-in default RPC.

### Running the Development Server

```bash
# Start the dev server (it runs on port 3000 by default)
npm run dev

# Or with yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. If you see the NeXus homepage, congratulations - it works. If you see an error, check the console. We've all been there.

**Important:** Run the dev server from the **NeXus-Front-End** directory (project root: `cd NeXus-Front-End` then `yarn dev`). Running from a parent repo root can cause `GET / 500` and errors like `Cannot find module 'next/dist/pages/_error'` or `Can't resolve 'next-flight-client-entry-loader'`.

**If you see `GET / 500` or "Module not found" for Next.js internals:** Do a clean reinstall from the project folder:

```bash
cd NeXus-Front-End
yarn reinstall
yarn dev
```

### Building for Production

```bash
# Build the production bundle (optimized, minified, ready to deploy)
npm run build

# Start the production server (for testing the build locally)
npm run start
```

---

## Tech Stack Deep Dive

**Frontend Framework**
- **Next.js 16** - React framework with server components, App Router, and all the modern goodies
- **React 19** - The latest React with improved performance and better developer experience

**Styling**
- **Tailwind CSS 4** - Utility-first CSS framework (because writing custom CSS is overrated)
- **CSS Modules** - For component-specific styles when Tailwind isn't enough

**Solana Integration**
- **Custom wallet integration** – We built our own (no Solana wallet-adapter CLI). In-house adapters and provider layer; Phantom, Solflare, Ledger, Glow, Magic Eden, etc. supported through our code.
- **@solana/web3.js** – Solana RPC and type-safe interactions (no Wagmi, no Viem – we're full Solana)

**State Management & Data Fetching**
- **TanStack Query (React Query)** - Server state management (because fetching data shouldn't be complicated)
- **React Context** - For global state that doesn't need a full state management library

**Animations**
- **Framer Motion** - Smooth animations and transitions (because static pages are boring)

**Type Safety**
- **TypeScript 5.9** - Because catching errors at compile time is better than catching them in production

---

## Pages & Routes

**/** - Landing page with hero section, featured drops, and hot collections. This is where users decide if they like you.

**/collections** - Browse all NFT collections with filters and a clean layout. (Search and live data in a later milestone.)

**/create** - Create new NFT collections. Placeholder shell; full step-by-step form in a later milestone.

**/dashboard** - Creator dashboard with placeholder stats and collection list. (Real metrics and management in a later milestone.)

**/tools** - Platform tools for NFT management. Because creators need more than just a launchpad.

---

## Development Guidelines

**Code Organization**
- Feature components live under `components/features/` by feature (home, collections – because finding things should be easy). Layout and UI get their own folders (the skeleton and the building blocks).
- Cross-folder imports use `@/` (no `../../../` hell). Co-located stuff (same-folder CSS, sibling components) uses relative paths – because we're not monsters who `@/` a file in the same directory.
- Components are self-contained and reusable where it makes sense (DRY principle, but actually).

**Styling**
- Tailwind CSS for layout and utilities (because writing custom CSS for every flexbox is so 2010).
- CSS Modules (`.module.css`) for component- or page-specific styles when Tailwind isn't enough (Header, HeroSection, collections page, etc.).
- Dark theme by default (backgrounds, text, borders)

**TypeScript**
- Everything is typed; types live in `types/index.ts` (NFTCollection, ApiResponse, the usual suspects). Because `any` is not a type – it's a cry for help.
- No `@ts-ignore` unless the world is on fire (and even then, we judge you).

**Comments**
- File-level block comments with `@author` and a P.S. line at the bottom. Section comments where they help. Because good code doesn't need to be a mystery novel.
- When we comment, we're helpful (what the block does, why) and occasionally cheeky (life’s too short for boring code).

---

## Color Palette

The dark theme uses a carefully curated color scheme that won't make your eyes bleed:

- **Background**: Deep blacks (#0a0a0f, #111118, #1a1a24) - because we're not afraid of the dark
- **Accent**: Web3 blue (#00d4ff) and purple (#7c3aed) - because Web3 needs its signature colors
- **Text**: White with varying opacity levels - because contrast matters
- **Borders**: Subtle dark grays (#252535, #2a2a3a) - because harsh borders are so 2010

---

## License & Repository

This project is **private and proprietary**. The GitHub repository is private. All rights reserved. Unauthorized copying, distribution, or use is not permitted.

---

## Credits

Built with care (and probably too much coffee) by the team at **[inventagious.com](https://inventagious.com)**.

**NeXus Web3:** [nexus-web3.com](https://nexus-web3.com)

*Because building Web3 launchpads is what we do. And we do it well.*

---

<div align="center">

*Internal use only. Contact the team for questions.*

</div>
