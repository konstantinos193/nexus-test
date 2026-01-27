#!/bin/bash

# Deploy NeXus Smart Contracts to Devnet

set -e

echo "🚀 Deploying NeXus Smart Contracts to Devnet..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first."
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install Solana CLI first."
    exit 1
fi

# Check network
NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ $NETWORK != *"devnet"* ]]; then
    echo "⚠️  Warning: Not on devnet. Current network: $NETWORK"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build programs
echo "📦 Building programs..."
anchor build

# Deploy programs
echo "🚀 Deploying programs..."

echo "  → Deploying nexus-launchpad..."
anchor deploy --program-name nexus-launchpad --provider.cluster devnet

echo "  → Deploying nexus-payment..."
anchor deploy --program-name nexus-payment --provider.cluster devnet

echo "  → Deploying nexus-collection..."
anchor deploy --program-name nexus-collection --provider.cluster devnet

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update program IDs in Anchor.toml"
echo "2. Update program IDs in Frontend/.env.local"
echo "3. Update program IDs in Backend/.env"
echo "4. Test the contracts with your frontend/backend"
