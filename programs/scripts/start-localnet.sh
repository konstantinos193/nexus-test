#!/bin/bash
# Start Solana Localnet Validator

echo "🚀 Starting Solana localnet validator..."
echo ""

# Check if validator is already running
if pgrep -f "solana-test-validator" > /dev/null; then
    echo "⚠️  Validator is already running!"
    echo "   Stop it first with: pkill solana-test-validator"
    exit 1
fi

# Check for reset flag
if [ "$1" == "--reset" ] || [ "$1" == "-r" ]; then
    echo "🔄 Resetting validator ledger..."
    if [ -d "test-ledger" ]; then
        rm -rf test-ledger
        echo "   Removed old ledger directory"
    fi
fi

# Start validator
echo "Starting validator on http://localhost:8899..."
solana-test-validator
