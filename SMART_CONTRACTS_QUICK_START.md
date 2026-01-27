# Smart Contracts Quick Start

Get your NeXus smart contracts up and running quickly!

## 🚀 Quick Setup (5 minutes)

### 1. Install Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 2. Configure Solana

```bash
# Set to devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2
```

### 3. Build & Deploy

**Option A: Using Docker (Recommended - No Installation Needed)**

```bash
cd programs

# Build with Docker
.\scripts\docker-build.ps1  # Windows PowerShell
# OR
./scripts/docker-build.sh   # Linux/macOS

# Deploy (inside Docker container)
docker-compose run --rm anchor-dev anchor deploy --provider.cluster devnet
```

**Option B: Local Build**

```bash
cd programs

# Build
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### 4. Update Program IDs

After deployment, copy the program IDs and update:

**Backend `.env`:**
```env
MINTING_PROGRAM_ID=your_program_id_here
PAYMENT_PROGRAM_ID=your_program_id_here
COLLECTION_PROGRAM_ID=your_program_id_here
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_MINTING_PROGRAM_ID=your_program_id_here
NEXT_PUBLIC_PAYMENT_PROGRAM_ID=your_program_id_here
NEXT_PUBLIC_COLLECTION_PROGRAM_ID=your_program_id_here
```

**`programs/Anchor.toml`:**
```toml
[programs.devnet]
nexus_launchpad = "your_program_id_here"
nexus_payment = "your_program_id_here"
nexus_collection = "your_program_id_here"
```

## ✅ Verify Deployment

```bash
# Check contract status via API
curl http://localhost:8000/api/solana/contracts/status
```

## 📝 What's Included

### 1. **nexus-launchpad** - Minting Program
- Initialize collections
- Mint NFTs with supply validation
- Pause/resume minting
- Time-based controls

### 2. **nexus-payment** - Payment Splitter
- Split payments between creator and platform
- Configurable platform fee (default 5%)
- Automatic distribution

### 3. **nexus-collection** - Collection Management
- Create NFT collections
- Store metadata
- Update metadata (authority only)

## 🧪 Test

```bash
cd programs
anchor test
```

## 📚 Next Steps

1. ✅ Contracts deployed
2. ✅ Program IDs updated
3. 🔄 Test with frontend/backend
4. 🔄 Integrate minting flow
5. 🔄 Test end-to-end
6. 🔒 Get audit (before mainnet)
7. 🚀 Deploy to mainnet

## 📖 Full Documentation

See `programs/SETUP.md` for detailed setup instructions.

## 🆘 Troubleshooting

**Build fails?**
```bash
cargo clean
anchor build
```

**Deployment fails?**
```bash
# Check balance
solana balance

# Get more SOL
solana airdrop 2
```

**Program ID not found?**
- Make sure you deployed to the correct network
- Check `Anchor.toml` configuration
- Verify program IDs in environment variables

---

**Ready to build!** 🎉
