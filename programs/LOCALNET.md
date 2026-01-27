# Localnet Development Guide

This guide explains how to develop and test NeXus smart contracts using a local Solana validator (localnet).

## What is Localnet?

Localnet is a local Solana blockchain validator that runs on your machine. It's perfect for:
- Fast development cycles
- No need for devnet SOL
- Complete control over the blockchain state
- Offline development

## Prerequisites

### Option 1: Using Docker (Recommended)

Just ensure Docker Desktop is running.

### Option 2: Local Installation

1. **Install Solana CLI:**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Install Anchor:**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

## Starting Localnet

### Using Docker

1. **Start the development container:**
   ```bash
   # Windows PowerShell
   .\scripts\docker-shell.ps1
   
   # Linux/macOS
   ./scripts/docker-shell.sh
   ```

2. **Inside the container, start the validator:**
   ```bash
   solana-test-validator
   ```

   This will start a local validator on `http://localhost:8899`

3. **In another terminal, configure Solana CLI:**
   ```bash
   solana config set --url localhost
   ```

### Local Installation

1. **Start the validator:**
   ```bash
   solana-test-validator
   ```

2. **Configure Solana CLI:**
   ```bash
   solana config set --url localhost
   ```

3. **Get some SOL (for localnet, it's free!):**
   ```bash
   solana airdrop 10
   ```

## Building Programs

### Using Docker

```bash
# Inside the Docker container
cd /workspace
anchor build
```

### Local

```bash
cd programs
anchor build
```

## Testing Programs

### Using Docker

```bash
# Inside the Docker container
cd /workspace
anchor test
```

This will:
- Start a local validator automatically
- Deploy your programs
- Run all tests
- Shut down the validator

### Local

```bash
cd programs
anchor test
```

## Deploying to Localnet

### Manual Deployment

1. **Ensure validator is running:**
   ```bash
   solana-test-validator
   ```

2. **Deploy programs:**
   ```bash
   anchor deploy
   ```

   Or deploy individually:
   ```bash
   anchor deploy --program-name nexus-launchpad
   anchor deploy --program-name nexus-payment
   anchor deploy --program-name nexus-collection
   ```

## Working with Localnet

### Check Validator Status

```bash
solana cluster-version
solana balance
```

### View Program Logs

```bash
solana logs
```

### Reset Validator State

Stop the validator (Ctrl+C) and restart it. This will reset all accounts and programs.

### Persist Validator State

To keep validator state between restarts:

```bash
solana-test-validator --reset
```

Or specify a ledger directory:

```bash
solana-test-validator --ledger ./test-ledger
```

## Configuration

### Anchor.toml for Localnet

Your `Anchor.toml` should have:

```toml
[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"
```

Or for Docker:

```toml
[provider]
cluster = "localnet"
wallet = "/root/.config/solana/id.json"
```

## Troubleshooting

### Validator Won't Start

**Error: "Address already in use"**
```bash
# Find and kill the process using port 8899
lsof -ti:8899 | xargs kill -9  # macOS/Linux
# Or on Windows, use Task Manager
```

### Programs Won't Deploy

**Error: "Insufficient funds"**
```bash
# Get more SOL
solana airdrop 10
```

### Anchor Version Issues

If you encounter version mismatches:

```bash
# Check installed version
anchor --version

# Install specific version
avm install 0.30.0
avm use 0.30.0
```

## Next Steps

1. ✅ Start localnet validator
2. ✅ Build your programs
3. ✅ Deploy to localnet
4. ✅ Test your programs
5. ✅ Integrate with frontend/backend
6. 🔄 Test end-to-end
7. 🚀 Deploy to devnet when ready

## Resources

- [Solana Test Validator Docs](https://docs.solana.com/developing/test-validator)
- [Anchor Localnet Guide](https://www.anchor-lang.com/docs/localnet)
- [Solana Cookbook](https://solanacookbook.com/)
