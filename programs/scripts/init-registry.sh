#!/bin/bash

# Set environment variables
export ANCHOR_PROVIDER_URL="https://rpc.nexus-web3.com"
export ANCHOR_WALLET="deployer-keypair.json"

# Find the registry PDA
REGISTRY_PDA=$(solana address -k deployer-keypair.json --from-seeds nexus-registry 2>/dev/null || echo "Could not find registry PDA")

echo "Registry PDA: $REGISTRY_PDA"

# Try to initialize the registry using anchor CLI
anchor invoke initialize_registry --provider.cluster https://rpc.nexus-web3.com
