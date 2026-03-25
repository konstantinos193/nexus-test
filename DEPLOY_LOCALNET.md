# Deploy to Localnet and Connect Backend + Frontend

After programs pass tests (`yarn test` in `programs/`), use this guide to run a local validator, deploy the programs, and connect the Backend (Docker) and Frontend.

## Program IDs (Localnet)

From `programs/Anchor.toml` — these are fixed by `declare_id!` in each program:

| Program          | Program ID |
|------------------|------------|
| nexus_collection | `BUkDSb56YuM9Q1BsiokLKPfaUYP84AzE7xLfVXtqQzTi` |
| nexus_launchpad  | `w6ELig1b3oETMQmiJkvPtyu99fnPwAGMJYSnaTXphma` |
| nexus_payment    | `8VLcrDKmzMXM1hDBzEU9ifRvaYSbuC4kfAF2tNa1qU9Z` |

---

## 1. Start Local Validator

In a **dedicated terminal**, start the Solana test validator (default RPC: `http://127.0.0.1:8899`):

```bash
solana-test-validator
```

Leave it running. Optionally persist state:

```bash
solana-test-validator --reset
# or: solana-test-validator --ledger ./localnet-ledger
```

---

## 2. Configure Solana CLI and Deploy Programs

In another terminal, from the repo root:

```bash
cd programs

# Point Solana CLI at localnet
solana config set --url http://127.0.0.1:8899

# Ensure keypair has SOL (check first: solana balance)
# If airdrop 10 fails with "rate limit", use smaller amounts:
solana airdrop 1
solana airdrop 1
# repeat as needed, then: solana balance

# Build (if not already built)
anchor build

# Deploy to localnet (Anchor.toml provider uses http://127.0.0.1:8899 for Windows compatibility)
anchor program deploy
```

If you prefer deploying one program at a time:

```bash
anchor program deploy --program-name nexus_collection
anchor program deploy --program-name nexus_launchpad
anchor program deploy --program-name nexus_payment
```

---

## 3. Connect Backend

Backend needs: `SOLANA_NETWORK=localnet`, `SOLANA_RPC_URL`, and the three program IDs.

### Option A: Backend runs on host (no Docker)

Copy the localnet env and start the server:

```powershell
cd Backend
copy env.localnet.example .env
# Or merge the Solana block from env.localnet.example into your existing .env
npm run start:dev
```

### Option B: Backend in Docker

`docker-compose.dev.yml` is already configured for localnet (backend talks to validator at `host.docker.internal:8899`). Start the stack:

```powershell
cd Backend
docker compose -f docker-compose.dev.yml up -d
```

On Linux, if `host.docker.internal` is not available, add under `backend` in `docker-compose.dev.yml`:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

---

## 4. Connect Frontend

Copy the localnet env and start the app:

```powershell
cd Frontend
copy env.localnet.example .env.local
# Or merge into existing .env.local
npm run dev
```

`env.localnet.example` sets `NEXT_PUBLIC_SOLANA_NETWORK=localnet`, RPC URL, and the three program IDs (whitelist uses the same program as minting).

```bash
cd Frontend
npm run dev
# or: yarn dev
```

---

## 5. Quick Checklist

| Step | Command / Action |
|------|------------------|
| 1 | `solana-test-validator` (keep running) |
| 2 | `cd programs` → `solana config set --url http://127.0.0.1:8899` → `solana airdrop 10` → `anchor build` → `anchor deploy --provider.cluster localnet` |
| 3 | Backend: set localnet env (`.env` or docker-compose). If Docker: `SOLANA_RPC_URL=http://host.docker.internal:8899` |
| 4 | Frontend: set `NEXT_PUBLIC_SOLANA_NETWORK=localnet`, RPC, and program IDs in `.env.local` |
| 5 | Start Backend (host or `docker compose up`), then Frontend (`npm run dev`) |

---

## 6. Verify

- **Validator:** `solana cluster-version` and `solana balance` (with `--url http://127.0.0.1:8899`).
- **Backend:** Health/contracts endpoint (if you have one) or logs; it should use localnet RPC and program IDs.
- **Frontend:** Wallet adapter should show “Localnet” (or similar); connect wallet and use the app against localnet.

---

## 7. Troubleshooting

- **“Insufficient funds” on deploy:** Run `solana balance`; if low, airdrop. If `solana airdrop 10` fails with “rate limit”, use `solana airdrop 1` several times. Confirm URL: `solana config set --url http://127.0.0.1:8899`.
- **Backend in Docker can’t reach validator:** Use `host.docker.internal:8899` (or `host-gateway` on Linux).
- **Frontend still on devnet:** Ensure `NEXT_PUBLIC_SOLANA_NETWORK=localnet` and restart `npm run dev`.
- **Port 8899 in use:** Stop any other `solana-test-validator` or process on 8899. Anchor tests use a different port (e.g. 8900) so they don’t conflict with this localnet.
- **Windows: “requested address is not valid” / connect to 0.0.0.0:8900:** Anchor.toml `[provider]` is set to `cluster = "http://127.0.0.1:8899"` so the client uses 127.0.0.1 instead of 0.0.0.0. Use `anchor program deploy` (not deprecated `anchor deploy`).
