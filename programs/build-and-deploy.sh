#!/bin/bash
set -e

# Add Solana CLI to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:${PATH}"

# Configuration - set these in your environment or .env file
RPC_URL="${RPC_URL:-https://api.devnet.solana.com}"
PROGRAM_ID="${PROGRAM_ID:-}"

echo "=== Building Nexus Launchpad Contracts ==="
cd programs
anchor build

echo ""
echo "=== Contract Built Successfully ==="
echo "Binary location: target/sbpf-solana-solana/release/"

if [ -n "$PROGRAM_ID" ]; then
    echo "Program ID: $PROGRAM_ID"
    echo "RPC URL: $RPC_URL"
    
    echo ""
    echo "=== Deploying to $RPC_URL ==="
    anchor deploy --provider.cluster devnet --program-id $PROGRAM_ID
else
    echo "Set PROGRAM_ID environment variable to deploy"
    echo "Example: export PROGRAM_ID=\"your_program_id_here\""
fi

echo ""
echo "=== Build Complete ==="
