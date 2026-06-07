# WSL Setup Guide for NeXus Smart Contracts

Complete setup guide for developing Solana/Anchor programs in WSL (Windows Subsystem for Linux).

## Step 1: Open WSL Terminal

Open PowerShell or Command Prompt and run:
```powershell
wsl
```

Or use the WSL terminal directly from Windows Terminal.

## Step 2: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # Verify installation
```

## Step 3: Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version  # Verify installation
```

**Add to your `~/.bashrc` to make it permanent:**
```bash
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 4: Install Anchor

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
anchor --version  # Verify installation
```

## Step 5: Navigate to Your Project

```bash
# From WSL, navigate to your Windows project
cd /mnt/e/programming/Martech/programs
```

**Note:** WSL can access Windows drives via `/mnt/c/`, `/mnt/d/`, `/mnt/e/`, etc.

## Step 6: Build Your Programs

```bash
anchor build
```

## Step 7: Start Localnet Validator

**In one terminal:**
```bash
solana-test-validator
```

**In another terminal (or new WSL window):**
```bash
cd /mnt/e/programming/Martech/programs
solana config set --url localhost
solana airdrop 10
anchor deploy
anchor test
```

## Quick Commands Reference

```bash
# Build programs
anchor build

# Start localnet validator (in background)
solana-test-validator > validator.log 2>&1 &

# Check validator status
solana cluster-version

# Get SOL for testing
solana airdrop 10

# Deploy programs
anchor deploy

# Run tests
anchor test

# Stop validator
pkill solana-test-validator
```

## Troubleshooting

### PATH Issues

If commands aren't found, add to `~/.bashrc`:
```bash
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.bashrc
```

### Permission Issues

If you get permission errors accessing Windows files:
```bash
# WSL should handle this automatically, but if needed:
sudo chown -R $USER:$USER /mnt/e/programming/Martech
```

### Port Already in Use

If validator won't start:
```bash
# Find and kill the process
lsof -ti:8899 | xargs kill -9
# Or
pkill solana-test-validator
```

## Next Steps

1. ✅ Build your programs: `anchor build`
2. ✅ Start localnet: `solana-test-validator`
3. ✅ Deploy: `anchor deploy`
4. ✅ Test: `anchor test`
5. ✅ Develop and iterate!

## Tips

- Keep the validator running in one terminal
- Use another terminal for building/testing
- Your Windows files are accessible at `/mnt/e/...`
- WSL is much faster than Docker for development!
