# Devnet Quick Start

Quick reference for getting started with devnet.

## 1. Install Dependencies

```bash
# Frontend
cd Frontend
npm install

# Backend
cd Backend
npm install
```

## 2. Environment Setup

### Frontend `.env.local`
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
BACKEND_URL=http://localhost:8000
```

### Backend `.env`
```env
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

## 3. Start Services

```bash
# Terminal 1 - Backend
cd Backend
npm run start:dev

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

## 4. Test Connection

```bash
# Health check (includes Solana status)
curl http://localhost:8000/health

# Network info
curl http://localhost:8000/api/solana/network
```

## 5. Get Devnet SOL

Visit [https://faucet.solana.com](https://faucet.solana.com) and enter your wallet address.

## 6. Use in Code

### Frontend
```typescript
import { useSolana } from '@/hooks/useSolana';
import { getSolanaConnection } from '@/lib/solana/connection';

// In component
const { connection, network, isDevnet } = useSolana();
```

### Backend
```typescript
import { SolanaService } from './solana/solana.service';

// In service/controller
constructor(private solana: SolanaService) {}

const balance = await this.solana.getAccountBalance(address);
```

## API Endpoints

- `GET /health` - Health check (includes Solana status)
- `GET /api/solana/network` - Network information
- `GET /api/solana/balance/:address` - Get account balance
- `GET /api/solana/validate-address/:address` - Validate address
- `GET /api/solana/verify-transaction/:signature` - Verify transaction

## Switch Networks

Change `SOLANA_NETWORK` / `NEXT_PUBLIC_SOLANA_NETWORK`:
- `devnet` - Development (default)
- `testnet` - Testing
- `mainnet-beta` - Production

**Remember to restart services after changing network!**

---

For detailed information, see [DEVNET_SETUP.md](./DEVNET_SETUP.md)
