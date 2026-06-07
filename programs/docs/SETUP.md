# Smart Contracts Setup Guide

Complete setup guide for developing and deploying NeXus smart contracts.

## Prerequisites Installation

### 1. Install Rust

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Windows:**
Download and run: https://rustup.rs/

Verify installation:
```bash
rustc --version
cargo --version
```

### 2. Install Solana CLI

**macOS/Linux:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

**Windows:**
Download from: https://docs.solana.com/cli/install-solana-cli-tools#windows

Add to PATH, then verify:
```bash
solana --version
```

### 3. Install Anchor Framework

```bash
# Install avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest

# Use latest version
avm use latest

# Verify installation
anchor --version
```

### 4. Set Up Solana Wallet

```bash
# Generate new keypair (if you don't have one)
solana-keygen new

# Or use existing keypair
solana-keygen recover 'prompt://?full-path=/path/to/keypair.json'
```

### 5. Configure for Devnet

```bash
# Set cluster to devnet
solana config set --url devnet

# Check configuration
solana config get

# Get devnet SOL
solana airdrop 2

# Verify balance
solana balance
```

## Project Setup

### Option A: Using Docker (Recommended - No Local Installation Needed)

1. **Ensure Docker Desktop is running**

2. **Build programs:**
   ```bash
   # Windows PowerShell
   .\scripts\docker-build.ps1
   
   # Linux/macOS
   ./scripts/docker-build.sh
   ```

3. **For interactive development:**
   ```bash
   # Windows PowerShell
   .\scripts\docker-shell.ps1
   
   # Linux/macOS
   ./scripts/docker-shell.sh
   ```

See `DOCKER.md` for detailed Docker instructions.

### Option B: Local Installation

### 1. Navigate to Programs Directory

```bash
cd programs
```

### 2. Build Programs

```bash
anchor build
```

This will:
- Compile all Rust programs
- Generate TypeScript types
- Create IDL files

### 3. Run Tests

```bash
anchor test
```

This will:
- Start a local validator
- Deploy programs
- Run all tests
- Shut down validator

## Development Workflow

### 1. Make Changes

Edit program files in `programs/*/src/lib.rs`

### 2. Build

```bash
anchor build
```

### 3. Test Locally

```bash
anchor test
```

### 4. Deploy to Devnet

**Using script (recommended):**
```bash
# Linux/macOS
./scripts/deploy.sh

# Windows PowerShell
.\scripts\deploy.ps1
```

**Manual deployment:**
```bash
anchor deploy --provider.cluster devnet
```

### 5. Update Program IDs

After deployment, update program IDs in:

1. `Anchor.toml`:
   ```toml
   [programs.devnet]
   nexus_launchpad = "YOUR_NEW_PROGRAM_ID"
   ```

2. Frontend `.env.local`:
   ```env
   NEXT_PUBLIC_MINTING_PROGRAM_ID=YOUR_NEW_PROGRAM_ID
   ```

3. Backend `.env`:
   ```env
   MINTING_PROGRAM_ID=YOUR_NEW_PROGRAM_ID
   ```

## Common Commands

```bash
# Build programs
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy specific program
anchor deploy --program-name nexus-launchpad --provider.cluster devnet

# Get program ID
solana address -k target/deploy/nexus_launchpad-keypair.json

# View program logs
solana logs

# Check program account
solana account YOUR_PROGRAM_ID
```

## Troubleshooting

### Build Errors

**Error: "cannot find crate"**
```bash
# Clean and rebuild
cargo clean
anchor build
```

**Error: "program too large"**
- Optimize build settings in `Cargo.toml`
- Reduce program size

### Deployment Errors

**Error: "insufficient funds"**
```bash
# Get more devnet SOL
solana airdrop 2
```

**Error: "program already deployed"**
- Update program ID in `Anchor.toml`
- Or use `--program-id` flag

### Test Errors

**Error: "validator not found"**
```bash
# Install Solana test validator
cargo install solana-test-validator
```

## Next Steps

1. ✅ Complete setup
2. ✅ Build and test programs
3. ✅ Deploy to devnet
4. ✅ Update program IDs
5. ✅ Integrate with frontend/backend
6. ✅ Test end-to-end
7. 🔒 Get audit (before mainnet)
8. 🚀 Deploy to mainnet

## Resources

- [Anchor Book](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Docs](https://docs.solana.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
