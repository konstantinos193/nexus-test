# NeXus Web3 Launchpad Frontend

*Modern NFT launchpad built with Next.js 16, React 19, and Web3 integration*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## Overview

NeXus is a Web3 launchpad by MarTech Networks for creators to launch NFT collections. Built with modern stack:

- **Next.js 16** with App Router
- **React 19** with server components  
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Wagmi + Viem** for Ethereum interactions
- **Phantom Connect SDK** for Solana wallets

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.staging.template .env.local
# Add NEXT_PUBLIC_PHANTOM_APP_ID

# Start dev server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
Frontend/
├── app/                    # Next.js pages
│   ├── page.tsx           # Landing page
│   ├── collections/       # Browse collections
│   ├── create/            # Create collections
│   └── dashboard/         # Creator dashboard
├── components/            # React components
│   ├── layout/           # Header, Footer, Layout
│   ├── features/         # Feature-specific components
│   ├── providers/        # Context providers
│   └── seo/              # JSON-LD structured data
├── lib/                  # Utilities and helpers
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
└── public/               # Static assets
```

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | Run ESLint |
| `pnpm spaghetti:check` | Detect code smells |

---

## Development Guidelines

- **TypeScript everywhere** - No `any` types
- **Absolute imports** - Use `@/` prefix
- **Component organization** - One component per file
- **Dark mode** - Default theme
- **No console.log** in commits

---

## Deployment

### Docker
```bash
# Staging
docker-compose -f docker-compose.staging.yml up

# Production  
docker-compose -f docker-compose.production.yml up
```

### PM2
```bash
# Production
pnpm pm2:start:prod

# Staging
pnpm pm2:start:staging
```

---

## Security

Report vulnerabilities privately to **security@inventagious.com**

We use:
- Gitleaks for secret detection
- Trivy for container scanning  
- pnpm audit for dependency checks

---

## Contributing

1. Check existing issues
2. Fork and create feature branch
3. Follow code standards
4. Run `pnpm lint` and `pnpm spaghetti:check`
5. Submit focused PR

---

## License

Private and proprietary. All rights reserved.

---

Built by **[inventagious.com](https://inventagious.com)**
