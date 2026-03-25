# WSL Troubleshooting Guide

## Quick Reference: Windows Path Conversion

When working in WSL bash, Windows paths need to be converted:
- **Windows:** `E:\programming\Martech\programs`
- **WSL:** `/mnt/e/programming/Martech/programs`

**Rule:** `DRIVE:\` becomes `/mnt/DRIVE/` (lowercase drive letter)

```bash
# Example: Navigate to your project
cd /mnt/e/programming/Martech/programs

# Run scripts
./scripts/start-localnet.sh
```

---

## SSL/TLS Troubleshooting

If you're getting SSL errors when installing Solana/Anchor in WSL, try these solutions:

## Solution 1: Update CA Certificates

```bash
sudo apt update
sudo apt install -y ca-certificates
sudo update-ca-certificates
```

Then retry:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

## Solution 2: Download Solana Binary Directly

For Solana 2.1.5 (includes Rust 1.79, required for Anchor 0.32.1+):

```bash
# Download Solana 2.1.5 release directly from GitHub
cd /tmp
wget https://github.com/solana-labs/solana/releases/download/v2.1.5/solana-release-x86_64-unknown-linux-gnu.tar.bz2

# Extract
tar jxf solana-release-x86_64-unknown-linux-gnu.tar.bz2

# Backup old installation (optional)
mv ~/.local/share/solana/install/active_release ~/.local/share/solana/install/active_release.backup 2>/dev/null || true

# Install to expected location
mkdir -p ~/.local/share/solana/install/active_release/bin
cp solana-release/bin/* ~/.local/share/solana/install/active_release/bin/

# Add to PATH (if not already there)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

# Verify
solana --version
cargo build-sbf --version  # Should show rustc 1.79.0
```

For older versions (e.g., Solana 1.18.0 with Rust 1.72):
```bash
cd /tmp
wget https://github.com/solana-labs/solana/releases/download/v1.18.0/solana-release-x86_64-unknown-linux-gnu.tar.bz2
tar jxf solana-release-x86_64-unknown-linux-gnu.tar.bz2
mkdir -p ~/.local/share/solana/install/active_release/bin
cp solana-release/bin/* ~/.local/share/solana/install/active_release/bin/
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
solana --version
```

## Solution 3: Use Windows Solana Installation

If WSL networking is problematic, you can use Solana installed on Windows:

1. Install Solana CLI on Windows (from https://docs.solana.com/cli/install-solana-cli-tools#windows)
2. Access it from WSL via Windows path:
```bash
# Add Windows Solana to WSL PATH
export PATH="/mnt/c/Users/konst/.local/share/solana/install/active_release/bin:$PATH"
```

## Solution 4: Fix WSL Network/SSL Issues

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install/reinstall certificates
sudo apt install --reinstall ca-certificates

# Try with verbose curl to see the issue
curl -v https://release.solana.com/stable/install
```

## Solution 5: Use Proxy Settings (if behind corporate firewall)

```bash
# If you're behind a proxy, set these:
export http_proxy=http://proxy.example.com:8080
export https_proxy=http://proxy.example.com:8080
```

## Recommended: Direct Binary Download

The most reliable method is downloading the binary directly:

```bash
cd /tmp
wget https://github.com/solana-labs/solana/releases/download/v1.18.0/solana-release-x86_64-unknown-linux-gnu.tar.bz2
tar jxf solana-release-x86_64-unknown-linux-gnu.tar.bz2
mkdir -p ~/.local/share/solana/install/active_release/bin
cp solana-release/bin/* ~/.local/share/solana/install/active_release/bin/
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
solana --version
```
