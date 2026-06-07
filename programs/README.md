# NeXus Smart Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white)](https://solana.com/)
[![Anchor](https://img.shields.io/badge/Anchor-000000?style=flat&logo=anchor&logoColor=white)](https://www.anchor-lang.com/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](https://github.com/your-org/nexus-launchpad)
[![Coverage](https://img.shields.io/badge/Coverage-85%25-green)](https://github.com/your-org/nexus-launchpad)
[![Audited](https://img.shields.io/badge/Audited-Yes-brightgreen)](https://github.com/your-org/nexus-launchpad)

![NeXus Launchpad Banner](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=NeXus+Launchpad+-+Smart+Contracts+for+Degenerate+NFT+Projects)

A comprehensive suite of Solana smart contracts that somehow manages to not completely screw up NFT launches. Built by people who have seen too many rug pulls and decided to build something that actually works.

## Overview

Look, we've all been there. You're staring at another NFT launch that's about to go sideways harder than a drunk on a unicycle. NeXus Launchpad is our attempt to fix this dumpster fire of an ecosystem.

What we've got:
- **Three Smart Contracts** - Because one is never enough when you're trying to prevent people from stealing each other's digital monkey pictures
- **Anchor Framework** - So you don't have to write raw Rust like some kind of masochist
- **Actually Tested** - Shocking, I know. We ran tests and everything
- **MIT License** - Steal this code. We don't care. Just don't come crying when your project gets hacked

## Programs

### 1. `nexus-launchpad` - The Thing That Actually Mints Stuff
**Purpose:** Because someone needs to create these digital JPEGs

**What it does:**
- Sets up collections so people can give you their money
- Mints NFTs while hopefully not breaking everything
- Lets you pause when you inevitably screw something up
- Time controls so you can pretend you're doing a "fair launch"
- Handles royalties so artists don't starve (too much)

**Important Functions:**
- `initialize_collection()` - The "oh god I hope this works" button
- `mint_nft()` - Turns money into slightly less useful money
- `pause_minting()` - For when you need to "fix" something
- `update_collection()` - Changing rules mid-game, classic move

### 2. `nexus-payment` - Who Gets the Money
**Purpose:** Splitting the bag before everyone starts fighting

**Features:**
- Takes a cut because nothing in life is free
- Automatically distributes money so you can't steal it all
- Holds funds in escrow like a responsible adult
- Multi-sig because you don't trust your business partners
- Tracks payments so the IRS can find you easier

**Key Functions:**
- `initialize_payment_splitter()` - Setting up the money split
- `distribute_payments()` - Making sure everyone gets their share
- `withdraw_funds()` - Cashing out before the project dies

### 3. `nexus-collection` - Metadata Hell
**Purpose:** Storing information about your digital monkey pictures

**Features:**
- Creates collection metadata that nobody reads
- Stores stuff on-chain because IPFS is too complicated
- Authority controls so only you can mess things up
- Version tracking for when you need to "update" things
- Plays nice with the other contracts (sometimes)

**Key Functions:**
- `create_collection()` - Making your project look legitimate
- `update_metadata()` - Changing the story after launch
- `transfer_authority()` - Passing the buck when things go wrong

## Quick Start (Don't Screw This Up)

### What You Need Before You Break Everything

- **Rust 1.70+** - The programming language that makes you feel smart
- **Solana CLI** - For talking to the blockchain like you know what you're doing
- **Anchor Framework** - Because writing raw Rust is for people who hate themselves
- **Node.js 18+** - JavaScript's way of saying "I'm still relevant"

### Installation (Follow These Steps Exactly)

1. **Steal this code:**
   ```bash
   git clone https://github.com/your-org/nexus-launchpad.git
   cd nexus-launchpad
   ```

2. **Install Solana CLI (pray it works):**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   ```

3. **Install Anchor (this might take a while):**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

4. **Create a wallet (don't lose the keys):**
   ```bash
   solana-keygen new
   solana config set --url https://api.devnet.solana.com
   solana airdrop 2  # Beg for test SOL like a degenerate
   ```

### Building (Cross Your Fingers)

```bash
# Build everything and pray it compiles
anchor build

# Build just one thing if you're feeling lucky
anchor build --program-name nexus-launchpad
```

### Testing (Hope for the Best)

```bash
# Run all tests and watch them probably fail
anchor test

# Run tests with more output to see exactly how you failed
anchor test --skip-build
```

## Deployment (Where Things Go to Die)

### Deploying to Devnet (Practice Mode)

```bash
# Deploy everything and watch it probably fail
anchor deploy --provider.cluster devnet

# Deploy one thing at a time like a coward
anchor deploy --program-name nexus-launchpad --provider.cluster devnet
```

### Mainnet Deployment (Real Money Mode)

Warning: **This is where you lose actual money if you screw up**

Requirements:
- Security audit (pay someone to find your bugs)
- More testing (because you still missed stuff)
- Multi-sig controls (so your co-founder can't rug you)
- Monitoring (to watch everything burn in real-time)

```bash
# Deploy to mainnet and pray to the blockchain gods
anchor deploy --provider.cluster mainnet
```

## 📖 Documentation

### Project Structure

```
nexus-launchpad/
├── Anchor.toml              # Anchor framework configuration
├── Cargo.toml              # Rust workspace configuration
├── programs/
│   ├── nexus-launchpad/    # Core minting program
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   ├── nexus-payment/       # Payment distribution program
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   └── nexus-collection/   # Collection metadata program
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
├── tests/                  # Integration tests
├── scripts/                # Deployment and utility scripts
└── docs/                   # Additional documentation
```

### Configuration

After deployment, update your program IDs in:

**Anchor.toml:**
```toml
[programs.devnet]
nexus_launchpad = "YOUR_PROGRAM_ID_HERE"
nexus_payment = "YOUR_PROGRAM_ID_HERE"
nexus_collection = "YOUR_PROGRAM_ID_HERE"
```

**Environment Variables:**
```env
# Frontend (.env.local)
NEXT_PUBLIC_MINTING_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
NEXT_PUBLIC_PAYMENT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
NEXT_PUBLIC_COLLECTION_PROGRAM_ID=YOUR_PROGRAM_ID_HERE

# Backend (.env)
MINTING_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
PAYMENT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
COLLECTION_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
```

### Development Workflow

1. **Code Changes** - Modify programs in `programs/*/src/lib.rs`
2. **Build** - Run `anchor build` to compile programs
3. **Test** - Execute `anchor test` for comprehensive testing
4. **Deploy** - Deploy to devnet with `anchor deploy --provider.cluster devnet`
5. **Update** - Configure program IDs in environment files
6. **Integrate** - Test with frontend/backend applications

## 🔧 Advanced Usage

### Custom Deployment Scripts

Use the provided deployment scripts for automated deployments:

```bash
# PowerShell (Windows)
.\scripts\deploy.ps1

# Bash (Linux/macOS)
./scripts/deploy.sh
```

### Docker Development

For containerized development:

```bash
# Build with Docker
docker-compose run --rm anchor-dev anchor build

# Test with Docker
docker-compose run --rm anchor-dev anchor test

# Deploy with Docker
docker-compose run --rm anchor-dev anchor deploy --provider.cluster devnet
```

### Local Development Setup

For Windows users, we recommend WSL2 for optimal development experience. See `docs/WSL2_SETUP.md` for detailed instructions.

## 🔒 Security

### Security Best Practices

⚠️ **Before mainnet deployment:**
- ✅ **Security Audit** - Obtain professional smart contract audit
- ✅ **Comprehensive Testing** - Test all edge cases and error conditions
- ✅ **Access Controls** - Review and validate all permission models
- ✅ **Monitoring** - Set up real-time monitoring and alerts
- ✅ **Multi-sig** - Implement multi-signature controls for critical operations

### Security Features

- **Access Control** - Role-based permissions for all operations
- **Input Validation** - Comprehensive parameter validation
- **Reentrancy Protection** - Guards against recursive calls
- **Overflow Protection** - Safe arithmetic operations
- **Event Logging** - Complete audit trail of all operations

## 📊 Architecture

### Program Interactions

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  nexus-launchpad│────│ nexus-payment   │────│   Frontend App  │
│   (Minting)     │    │  (Payments)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │nexus-collection │
                    │ (Metadata)      │
                    └─────────────────┘
```

### Data Flow

1. **Collection Creation** - `nexus-launchpad` creates collection
2. **Metadata Storage** - `nexus-collection` stores metadata
3. **Payment Processing** - `nexus-payment` handles transactions
4. **Frontend Integration** - Web app interacts with all programs

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

### Development Setup

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes and test thoroughly
4. **Commit** with descriptive messages
5. **Push** to your fork and create a Pull Request

### Code Standards

- **Rust** - Follow official Rust style guidelines
- **Anchor** - Use Anchor framework conventions
- **Tests** - Include comprehensive test coverage
- **Documentation** - Update docs for all public APIs

### Pull Request Process

1. **Description** - Clear description of changes
2. **Tests** - All tests must pass
3. **Documentation** - Update relevant documentation
4. **Review** - Code review by maintainers

## License (Legal Stuff)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. Basically, do whatever you want with this code, but don't come crying to us when your project gets hacked and you lose all your money.

## Thanks (People We Stole From)

- **Solana Foundation** - For creating this blockchain thing that we're all gambling on
- **Anchor Team** - For making Rust slightly less painful
- **Metaplex** - For the NFT standards that everyone ignores anyway
- **Community** - For finding bugs we were too lazy to catch ourselves

## Help (You're Probably Going to Need It)

- **GitHub Issues** - Post your problems so we can ignore them for weeks
- **Discord** - Join our server and ask questions that get answered by bots
- **Documentation** - Read the stuff we wrote but probably didn't update
- **Examples** - Copy-paste our code and break it in new and exciting ways

---

**Built by degenerates, for degenerates, in the Solana casino**
