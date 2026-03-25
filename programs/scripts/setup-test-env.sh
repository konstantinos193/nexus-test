#!/bin/bash
# Helper script to set up test environment (validator + deploy)
# This is used by test-specific.sh to ensure environment is ready

set -e

echo "🔍 Checking if validator is running on port 8900..."

# Check if validator is running
VALIDATOR_RUNNING=false
if command -v curl &> /dev/null; then
    if curl -s http://localhost:8900 > /dev/null 2>&1; then
        VALIDATOR_RUNNING=true
    fi
elif command -v nc &> /dev/null; then
    if nc -z localhost 8900 2>/dev/null; then
        VALIDATOR_RUNNING=true
    fi
else
    # Try to check with solana command
    if solana cluster-version --url http://localhost:8900 &>/dev/null 2>&1; then
        VALIDATOR_RUNNING=true
    fi
fi

if [ "$VALIDATOR_RUNNING" = false ]; then
    echo "⚠️  Validator not running. Starting validator..."
    
    # Kill any existing validator on port 8900
    pkill -f "solana-test-validator.*8900" 2>/dev/null || true
    sleep 2
    
    # Start validator in background
    solana-test-validator --rpc-port 8900 --reset > /tmp/validator.log 2>&1 &
    VALIDATOR_PID=$!
    
    echo "   Validator starting (PID: $VALIDATOR_PID)..."
    echo "   Waiting for validator to be ready..."
    
    # Wait for validator to be ready (up to 30 seconds)
    for i in {1..30}; do
        if solana cluster-version --url http://localhost:8900 &>/dev/null 2>&1; then
            echo "   ✅ Validator is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "   ❌ Validator failed to start after 30 seconds"
            kill $VALIDATOR_PID 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
    
    # Set Solana config
    solana config set --url http://localhost:8900
    
    # Airdrop SOL
    echo "   💰 Airdropping SOL..."
    solana airdrop 10
    
    # Deploy programs
    echo "   📦 Deploying programs..."
    anchor deploy
    
    echo "   ✅ Environment ready!"
else
    echo "✅ Validator already running"
    # Still deploy to ensure programs are up to date
    echo "   📦 Ensuring programs are deployed..."
    solana config set --url http://localhost:8900
    anchor deploy
fi

# Set environment variables
export ANCHOR_PROVIDER_URL="http://localhost:8900"
export ANCHOR_WALLET="${HOME}/.config/solana/id.json"

echo ""
echo "Environment variables set:"
echo "  ANCHOR_PROVIDER_URL=$ANCHOR_PROVIDER_URL"
echo "  ANCHOR_WALLET=$ANCHOR_WALLET"
echo ""
