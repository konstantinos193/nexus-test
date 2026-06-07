# Local Setup (No Docker) - Quick Start

If Docker is causing issues, use local installation instead.

## Prerequisites

### Windows

1. **Install Rust:**
   - Download from: https://rustup.rs/
   - Run the installer
   - Restart terminal

2. **Install Solana CLI:**
   - Download from: https://docs.solana.com/cli/install-solana-cli-tools#windows
   - Or use WSL (Windows Subsystem for Linux)

3. **Install Anchor:**
   ```powershell
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

### Linux/macOS

1. **Install Rust:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. **Install Solana CLI:**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Install Anchor:**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

## Quick Start

1. **Navigate to programs directory:**
   ```bash
   cd programs
   ```

2. **Build programs:**
   ```bash
   anchor build
   ```

3. **Start localnet validator:**
   ```bash
   solana-test-validator
   ```

4. **In another terminal, configure and deploy:**
   ```bash
   solana config set --url localhost
   solana airdrop 10
   anchor deploy
   anchor test
   ```

## Why Docker Was Failing

1. **SSL/TLS Issues**: Docker container can't establish secure connections
2. **Network Configuration**: Docker networking may be blocking connections
3. **Anchor Installation**: Version conflicts and compilation issues

## Alternative: Use WSL on Windows

If you're on Windows, WSL (Windows Subsystem for Linux) gives you a Linux environment without Docker:

1. Install WSL: `wsl --install`
2. Follow Linux instructions above
3. Much simpler than Docker!
