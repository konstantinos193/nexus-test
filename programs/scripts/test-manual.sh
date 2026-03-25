#!/bin/bash
# Manual test runner - bypasses anchor test compilation issues
# This script builds, starts validator, deploys, and runs tests separately

set -e

echo "🔨 Step 1: Building programs..."
anchor build

echo ""
echo "🚀 Step 2: Starting test validator on port 8900..."
# Kill any existing validator on port 8900
pkill -f "solana-test-validator.*8900" || true
sleep 2

# Start validator in background on port 8900 (as configured in Anchor.toml)
solana-test-validator --rpc-port 8900 --reset &
VALIDATOR_PID=$!

echo "   Validator started with PID: $VALIDATOR_PID"
echo "   Waiting for validator to be ready..."
sleep 5

# Wait for validator to be ready
for i in {1..30}; do
  if solana cluster-version --url http://localhost:8900 &>/dev/null; then
    echo "   ✅ Validator is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "   ❌ Validator failed to start"
    kill $VALIDATOR_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo ""
echo "💰 Step 3: Airdropping SOL..."
solana config set --url http://localhost:8900
solana airdrop 10

echo ""
echo "📦 Step 4: Deploying programs..."
anchor deploy

echo ""
echo "🧪 Step 5: Running tests..."
yarn test

echo ""
echo "🛑 Step 6: Stopping validator..."
kill $VALIDATOR_PID 2>/dev/null || true
wait $VALIDATOR_PID 2>/dev/null || true

echo ""
echo "✅ Tests completed!"
