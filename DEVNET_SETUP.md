# Devnet Setup Guide for NeXus NFT Launchpad

This guide will help you set up the NeXus NFT Launchpad to work with Solana devnet for development and testing.

---

## Overview

The project is now configured to work with Solana devnet by default. This includes:

- ✅ Solana Web3.js integration
- ✅ Metaplex Token Metadata support
- ✅ Network configuration (devnet/testnet/mainnet)
- ✅ Frontend and Backend Solana services
- ✅ Environment variable configuration

---

## Quick Start

### 1. Install Dependencies

**Frontend:**
```bash
cd Frontend
npm install
```

**Backend:**
```bash
cd Backend
npm install
```

This will install:
- `@solana/web3.js` - Solana JavaScript SDK
- `@metaplex-foundation/mpl-token-metadata` - Metaplex NFT metadata standard

---

## 2. Environment Configuration

### Frontend Environment

Create `.env.local` in the `Frontend` directory:

```env
# Backend API URL
BACKEND_URL=http://localhost:8000

# API Keys
API_KEY=your_secure_api_key_here
NEXT_PUBLIC_API_KEY=your_secure_api_key_here
BACKEND_API_KEY=your_backend_api_key_here

# Phantom Wallet (optional)
NEXT_PUBLIC_PHANTOM_APP_ID=your_phantom_app_id_here

# Solana Configuration - DEVNET
NEXT_PUBLIC_SOLANA_NETWORK=devnet
# Optional: Custom RPC URL (defaults to public devnet RPC)
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

**Note:** For custom RPC providers (Helius, QuickNode, etc.), set `NEXT_PUBLIC_SOLANA_RPC_URL` to your custom endpoint.

### Backend Environment

Update `.env` in the `Backend` directory (or copy from `env.example`):

```env
# Database
DATABASE_URL="postgresql://postgres:nexus123@localhost:5432/nexus_db?schema=public"

# Server
PORT=8000
FRONTEND_URL=http://localhost:3000

# API Key
API_KEY=your_secure_api_key_here

# Solana Configuration - DEVNET
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
```

---

## 3. Network Options

### Devnet (Default - Recommended for Development)
- **Network:** `devnet`
- **RPC URL:** `https://api.devnet.solana.com`
- **Use Case:** Development and testing
- **SOL:** Free from faucets
- **Features:** Full Solana functionality, resets periodically

### Testnet
- **Network:** `testnet`
- **RPC URL:** `https://api.testnet.solana.com`
- **Use Case:** Pre-production testing
- **SOL:** Free from faucets

### Mainnet
- **Network:** `mainnet-beta`
- **RPC URL:** `https://api.mainnet-beta.solana.com`
- **Use Case:** Production
- **SOL:** Real SOL required
- **Warning:** Only use after thorough testing!

---

## 4. Getting Devnet SOL

To test transactions on devnet, you'll need devnet SOL:

### Option 1: Solana Faucet (Web)
1. Visit [https://faucet.solana.com](https://faucet.solana.com)
2. Enter your wallet address
3. Request devnet SOL

### Option 2: CLI Faucet
```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### Option 3: Phantom Wallet
1. Switch Phantom to devnet
2. Use the built-in faucet feature

---

## 5. Switching Networks

### Frontend
Change `NEXT_PUBLIC_SOLANA_NETWORK` in `.env.local`:
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet  # or testnet, mainnet-beta
```

### Backend
Change `SOLANA_NETWORK` in `.env`:
```env
SOLANA_NETWORK=devnet  # or testnet, mainnet-beta
```

**Important:** Restart both frontend and backend after changing network settings.

---

## 6. Using Custom RPC Providers

For better performance and rate limits, consider using custom RPC providers:

### Helius
1. Sign up at [helius.dev](https://helius.dev)
2. Get your API key
3. Set RPC URL:
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
   SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
   ```

### QuickNode
1. Sign up at [quicknode.com](https://quicknode.com)
2. Create a devnet endpoint
3. Set RPC URL:
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=https://YOUR_ENDPOINT.quicknode.com
   SOLANA_RPC_URL=https://YOUR_ENDPOINT.quicknode.com
   ```

---

## 7. Testing the Setup

### Backend Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-25T...",
  "database": "connected",
  "solana": "connected",
  "solanaNetwork": "devnet"
}
```

### Frontend Network Info
The frontend can access network info via:
```typescript
import { getNetworkInfo } from '@/lib/solana/connection';

const info = await getNetworkInfo();
console.log(info);
```

---

## 8. Project Structure

### Frontend Solana Files
```
Frontend/
├── lib/
│   └── solana/
│       ├── config.ts          # Network configuration
│       └── connection.ts      # Connection utilities
└── components/
    └── providers/
        └── PhantomProvider.tsx  # Wallet provider
```

### Backend Solana Files
```
Backend/
└── src/
    └── solana/
        ├── solana.config.ts   # Network configuration
        ├── solana.service.ts # Solana service
        └── solana.module.ts  # NestJS module
```

---

## 9. Next Steps

Now that devnet is configured, you can:

1. **Test Wallet Connection**
   - Connect Phantom wallet on devnet
   - Verify balance and network

2. **Deploy Test Programs** (when ready)
   - Use Anchor framework for Solana programs
   - Deploy to devnet for testing

3. **Test NFT Minting** (when contracts are ready)
   - Create test collections
   - Mint test NFTs on devnet

4. **Monitor Transactions**
   - Use Solana Explorer: [explorer.solana.com](https://explorer.solana.com/?cluster=devnet)
   - Check transaction status via API

---

## 10. Troubleshooting

### Connection Issues
- **Error:** "Failed to fetch network info"
  - **Solution:** Check RPC URL and network settings
  - **Solution:** Verify internet connection
  - **Solution:** Try a different RPC provider

### Wallet Connection Issues
- **Error:** "Wallet not found"
  - **Solution:** Install Phantom wallet extension
  - **Solution:** Ensure wallet is on devnet

### Transaction Failures
- **Error:** "Insufficient funds"
  - **Solution:** Get devnet SOL from faucet
  - **Solution:** Check wallet balance

### Backend Not Starting
- **Error:** "Cannot find module '@solana/web3.js'"
  - **Solution:** Run `npm install` in Backend directory
  - **Solution:** Check Node.js version (requires Node 18+)

---

## 11. Resources

- **Solana Docs:** [docs.solana.com](https://docs.solana.com)
- **Devnet Explorer:** [explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
- **Metaplex Docs:** [docs.metaplex.com](https://docs.metaplex.com)
- **Solana Web3.js:** [solana-labs.github.io/solana-web3.js](https://solana-labs.github.io/solana-web3.js/)

---

## 12. Security Notes

⚠️ **Important:**
- Never commit `.env` or `.env.local` files to git
- Use different API keys for devnet and mainnet
- Always test thoroughly on devnet before mainnet
- Keep private keys secure and never expose them

---

**Status:** ✅ Devnet configuration complete  
**Last Updated:** January 25, 2026  
**Network:** Devnet (default)
