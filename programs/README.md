# NeXus Smart Contracts

Solana programs (smart contracts) for the NeXus NFT Launchpad platform.

## Programs

### 1. `nexus-launchpad`
**Purpose:** Core minting program for NFT collections
- Initialize collections with configurable supply, price, and timing
- Mint NFTs with supply validation
- Pause/resume minting
- Time-based access control

### 2. `nexus-payment`
**Purpose:** Payment splitting between creators and platform
- Initialize payment splitter with configurable platform fee
- Distribute payments automatically
- Withdraw funds from escrow

### 3. `nexus-collection`
**Purpose:** Collection metadata management
- Create NFT collections
- Store collection metadata
- Update metadata (authority only)

## Prerequisites

### Option 1: WSL2 + Ubuntu (Recommended for Windows - Production Grade)

**Windows users:** Use WSL2 for reliable Solana development. Native Windows tooling is still problematic in 2026.

**Quick setup (from Windows PowerShell):**
```powershell
# Launch WSL2 and run automated setup
.\scripts\wsl2-setup.ps1
```

**Or from WSL2 terminal:**
```bash
cd /mnt/e/programming/Martech/programs
./scripts/wsl2-setup.sh
```

**For detailed instructions:** See [`WSL2_PRODUCTION_SETUP.md`](./WSL2_PRODUCTION_SETUP.md)

This is the battle-tested setup used by professional teams and matches Linux CI/CD environments.

### Option 2: Docker (Cross-platform - No Local Installation)

Just install Docker Desktop and you're ready! See `DOCKER.md` for details.

### Option 3: Native Linux/macOS Installation

1. **Install Rust:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. **Install Solana CLI:**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   ```

3. **Install Anchor:**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

4. **Set up Solana wallet:**
   ```bash
   solana-keygen new
   ```

5. **Configure for devnet:**
   ```bash
   solana config set --url https://api.devnet.solana.com
   solana airdrop 2  # Get devnet SOL
   ```

## Building

### Using Docker (Recommended)

**Windows PowerShell:**
```powershell
.\scripts\docker-build.ps1
```

**Linux/macOS:**
```bash
./scripts/docker-build.sh
```

### Local Build

```bash
cd programs
anchor build
```

## Testing

### Using Docker
```bash
docker-compose run --rm anchor-dev anchor test
```

### Local
```bash
anchor test
```

## Deployment

### Deploy to Devnet

**Using Docker:**
```bash
# Build first
.\scripts\docker-build.ps1  # or ./scripts/docker-build.sh

# Deploy
docker-compose run --rm anchor-dev anchor deploy --provider.cluster devnet
```

**Local:**
```bash
# Build first
anchor build

# Deploy all programs
anchor deploy --provider.cluster devnet

# Or deploy individually
anchor deploy --program-name nexus-launchpad --provider.cluster devnet
anchor deploy --program-name nexus-payment --provider.cluster devnet
anchor deploy --program-name nexus-collection --provider.cluster devnet
```

### Get Program IDs

After deployment, update the program IDs in:
- `Anchor.toml` - Update the `[programs.devnet]` section
- `Frontend/lib/solana/constants.ts` - Update `PROGRAM_IDS`
- `Backend/.env` - Add program IDs as environment variables

## Program IDs

After deployment, your program IDs will be displayed. Update these in:

1. `Anchor.toml`:
   ```toml
   [programs.devnet]
   nexus_launchpad = "YOUR_PROGRAM_ID_HERE"
   nexus_payment = "YOUR_PROGRAM_ID_HERE"
   nexus_collection = "YOUR_PROGRAM_ID_HERE"
   ```

2. Frontend `.env.local`:
   ```env
   NEXT_PUBLIC_MINTING_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
   NEXT_PUBLIC_PAYMENT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
   NEXT_PUBLIC_COLLECTION_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
   ```

3. Backend `.env`:
   ```env
   MINTING_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
   PAYMENT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
   COLLECTION_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
   ```

## Project Structure

```
programs/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml              # Workspace Cargo config
├── programs/
│   ├── nexus-launchpad/    # Minting program
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   ├── nexus-payment/       # Payment splitter
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   └── nexus-collection/   # Collection management
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
├── tests/                  # Integration tests
└── scripts/                # Deployment scripts
```

## Development Workflow

1. **Make changes** to programs in `programs/*/src/lib.rs`
2. **Build** with `anchor build`
3. **Test** with `anchor test`
4. **Deploy** to devnet with `anchor deploy --provider.cluster devnet`
5. **Update program IDs** in config files
6. **Test integration** with frontend/backend

## Security Notes

⚠️ **Before mainnet deployment:**
- Get smart contract audit
- Test thoroughly on devnet
- Review all access controls
- Test edge cases and error conditions
- Set up monitoring and alerts

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Metaplex Documentation](https://docs.metaplex.com/)
