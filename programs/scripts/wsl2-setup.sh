#!/bin/bash

# WSL2 Production Setup Script for NeXus Smart Contracts
# This script automates the setup of Rust, Solana CLI, and Anchor in WSL2
# Run this from inside WSL2 (Ubuntu)

set -e

echo "🚀 NeXus WSL2 Production Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in WSL
if ! grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null ; then
    echo -e "${YELLOW}⚠️  Warning: This doesn't appear to be WSL. This script is designed for WSL2.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Update Ubuntu
echo -e "${GREEN}📦 Step 1: Updating Ubuntu packages...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential pkg-config libssl-dev curl git ca-certificates

# Step 2: Install Rust
echo -e "${GREEN}🦀 Step 2: Installing Rust...${NC}"
if command -v rustc &> /dev/null; then
    echo "Rust already installed: $(rustc --version)"
else
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo 'source "$HOME/.cargo/env"' >> ~/.bashrc
    echo "Rust installed: $(rustc --version)"
fi

# Step 3: Install Solana CLI
echo -e "${GREEN}⚡ Step 3: Installing Solana CLI...${NC}"
if command -v solana &> /dev/null; then
    echo "Solana CLI already installed: $(solana --version)"
else
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
    echo "Solana CLI installed: $(solana --version)"
fi

# Step 4: Install Anchor
echo -e "${GREEN}⚓ Step 4: Installing Anchor...${NC}"
if command -v anchor &> /dev/null; then
    echo "Anchor already installed: $(anchor --version)"
else
    # Install avm
    if ! command -v avm &> /dev/null; then
        echo "Installing AVM (Anchor Version Manager)..."
        cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
        export PATH="$HOME/.cargo/bin:$PATH"
        echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
    fi
    
    # Install and use latest Anchor
    avm install latest
    avm use latest
    echo "Anchor installed: $(anchor --version)"
fi

# Step 5: Verify installations
echo ""
echo -e "${GREEN}✅ Verification:${NC}"
echo "================================"
echo "Rust: $(rustc --version)"
echo "Cargo: $(cargo --version)"
echo "Solana: $(solana --version)"
echo "Anchor: $(anchor --version)"
echo ""

# Step 6: Configure Solana (interactive)
echo -e "${YELLOW}📝 Step 5: Solana Configuration${NC}"
echo "================================"
echo "1. Devnet (recommended for testing)"
echo "2. Mainnet (production)"
echo "3. Skip configuration"
read -p "Select network (1-3): " network_choice

case $network_choice in
    1)
        solana config set --url https://api.devnet.solana.com
        echo "✅ Configured for Devnet"
        echo ""
        read -p "Get devnet SOL airdrop? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            solana airdrop 2 || echo "⚠️  Airdrop may be rate-limited. Try again later or use https://faucet.solana.com/"
        fi
        ;;
    2)
        solana config set --url https://api.mainnet-beta.solana.com
        echo "✅ Configured for Mainnet"
        echo -e "${RED}⚠️  Warning: You're now configured for Mainnet. Be careful!${NC}"
        ;;
    3)
        echo "⏭️  Skipped configuration"
        ;;
    *)
        echo "⏭️  Skipped configuration"
        ;;
esac

# Step 7: Wallet setup
echo ""
echo -e "${YELLOW}🔑 Step 6: Wallet Setup${NC}"
echo "================================"
if [ -f ~/.config/solana/id.json ]; then
    echo "✅ Wallet already exists at ~/.config/solana/id.json"
    solana config set --keypair ~/.config/solana/id.json
else
    read -p "Create new wallet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        solana-keygen new
        solana config set --keypair ~/.config/solana/id.json
        echo "✅ New wallet created"
    else
        echo "⏭️  Skipped wallet creation"
        echo "You can create one later with: solana-keygen new"
    fi
fi

# Final instructions
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Navigate to your project:"
echo "   cd /mnt/e/programming/Martech/programs"
echo ""
echo "2. Build your programs:"
echo "   anchor build"
echo ""
echo "3. Deploy to devnet:"
echo "   anchor deploy --provider.cluster devnet"
echo ""
echo "4. Or use the deployment script:"
echo "   ./scripts/deploy.sh"
echo ""
echo "📖 For detailed instructions, see: WSL2_PRODUCTION_SETUP.md"
echo ""
echo -e "${YELLOW}💡 Tip: You may need to restart your terminal or run 'source ~/.bashrc'${NC}"
echo "   to ensure all PATH changes are loaded."
